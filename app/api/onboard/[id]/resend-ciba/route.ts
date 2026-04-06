import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0/client';
import { getJob, updateJobCIBARequest } from '@/lib/store/jobs';
import { requestProductionAccessApproval } from '@/lib/auth0/ciba';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status !== 'awaiting_ciba') {
    return NextResponse.json({ error: 'Job is not awaiting CIBA approval' }, { status: 400 });
  }

  const { requestId } = await requestProductionAccessApproval({
    userId: session.user.sub,
    newHireName: `${job.newHire.firstName} ${job.newHire.lastName}`,
    accessLevel: 'Production Read Access (AWS, Datadog)',
    jobId: id,
  });

  await updateJobCIBARequest(id, requestId);

  return NextResponse.json({ ok: true, requestId });
}
