import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0/client';
import { v4 as uuidv4 } from 'uuid';
import { createJob, initializeJobSteps, updateJobStatus, getJob, appendAuditEntry } from '@/lib/store/jobs';
import { fetchAllConnectionTokens, SupportedService } from '@/lib/auth0/token-vault';
import { OnboardingJob } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newHire = await req.json();
  const jobId = uuidv4();

  // Fetch all tokens HERE while we have request context (session/cookies).
  // Agents run async and cannot access the session directly.
  // We preserve the full { token, source } entry so each agent's audit log
  // accurately reports whether it used Auth0 Token Vault or a fallback credential.
  const services: SupportedService[] = ['github', 'slack', 'google-gmail', 'google-calendar'];
  let tokenMap: Record<string, { token: string; source: 'token-vault' | 'fallback' }> = {};

  try {
    tokenMap = await fetchAllConnectionTokens(services);
  } catch (err) {
    console.error('[start] Token fetch error:', err);
  }

  // Summary for initial audit entry
  const vaultTokens  = Object.entries(tokenMap).filter(([, v]) => v.source === 'token-vault').map(([k]) => k);
  const fallbackTokens = Object.entries(tokenMap).filter(([, v]) => v.source === 'fallback').map(([k]) => k);

  const tokenSummary = [
    vaultTokens.length  ? `Token Vault: ${vaultTokens.join(', ')}`   : '',
    fallbackTokens.length ? `Fallback: ${fallbackTokens.join(', ')}` : '',
  ].filter(Boolean).join(' | ') || 'none';

  const job: OnboardingJob = {
    id: jobId,
    createdAt: new Date(),
    createdBy: session.user.sub,
    newHire,
    status: 'queued',
    steps: initializeJobSteps(newHire),
    auditLog: [
      {
        timestamp: new Date(),
        action: 'Onboarding job created',
        platform: 'system',
        details: `Job created by ${session.user.name ?? session.user.email} for ${newHire.firstName} ${newHire.lastName}. Credentials fetched — ${tokenSummary}`,
      },
    ],
  };

  createJob(job);

  // Launch all 4 agents concurrently via LangGraph parallel graph.
  runAgentsAsync(job, session.user.sub, tokenMap).catch(console.error);

  return NextResponse.json({ jobId });
}

async function runAgentsAsync(
  job: OnboardingJob,
  userId: string,
  tokenMap: Record<string, { token: string; source: 'token-vault' | 'fallback' }>
) {
  await updateJobStatus(job.id, 'running');
  try {
    const { onboardingGraph } = await import('@/lib/agents/graph');

    // All 4 agents run in parallel — LangGraph fans out from START and
    // merges state back via reducers when all agents complete.
    const finalState = await onboardingGraph.invoke({
      jobId:       job.id,
      newHire:     job.newHire,
      userId,
      tokenMap,           // Full { token, source } map — preserves vault vs fallback info
      steps:       job.steps,
      auditLog:    job.auditLog,
      currentStep: null,
    });

    // Sync the merged audit log from all parallel agents back to the job store
    const existingJob = getJob(job.id);
    if (existingJob && finalState.auditLog?.length > existingJob.auditLog.length) {
      const newEntries = finalState.auditLog.slice(existingJob.auditLog.length);
      for (const entry of newEntries) {
        await appendAuditEntry(job.id, entry);
      }
    }

    const currentJob = getJob(job.id);
    if (currentJob && currentJob.status === 'running') {
      await updateJobStatus(job.id, 'completed');
    }
  } catch (err) {
    console.error('[runAgentsAsync] error:', err);
    await updateJobStatus(job.id, 'failed');
  }
}
