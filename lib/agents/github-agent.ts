import { Octokit } from '@octokit/rest';
import { AgentState, AuditEntry } from '../types';
import { getTokenFromMap } from '../auth0/token-vault';
import { updateJobStep } from '../store/jobs';
import { reasonAboutNewHire, getLLM } from './llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export async function runGitHubAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, newHire, tokenMap } = state;
  const auditEntries: AuditEntry[] = [];

  try {
    await updateJobStep(jobId, 'github', 'running');

    const { token, auditEntry } = getTokenFromMap(
      tokenMap,
      'github',
      `Invite ${newHire.githubUsername} to org and grant access to ${newHire.githubRepos?.length ?? 0} repos`
    );
    auditEntries.push(auditEntry);

    const octokit = new Octokit({ auth: token });
    const org = process.env.GITHUB_ORG_NAME || 'Onboarding-demoo';

    // ── 1. Fetch all org repos to validate requested repos ─────────────────
    let orgRepoNames: string[] = [];
    try {
      const { data: orgRepos } = await octokit.rest.repos.listForOrg({ org, per_page: 100 });
      orgRepoNames = orgRepos.map((r) => r.name);
      auditEntries.push({
        timestamp: new Date(),
        action: 'GitHub org repos fetched',
        platform: 'github',
        details: `Found ${orgRepoNames.length} repos in ${org}: ${orgRepoNames.join(', ')}`,
        tokenScope: 'github:repo',
      });
    } catch (e) {
      auditEntries.push({
        timestamp: new Date(),
        action: 'GitHub org repos fetch skipped',
        platform: 'github',
        details: `Could not list org repos — will attempt all requested repos anyway`,
        tokenScope: 'github:repo',
      });
    }

    // ── 2. LLM Reasoning — which repos are relevant to this role ───────────
    let reposToGrant = newHire.githubRepos ?? [];
    try {
      const { reasoning, plan } = await reasonAboutNewHire(newHire, 'github');
      auditEntries.push({
        timestamp: new Date(),
        action: 'GitHub agent reasoning',
        platform: 'github',
        details: `🤖 ${reasoning}`,
        tokenScope: 'llm:reasoning',
      });
      if (plan) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'GitHub agent action plan',
          platform: 'github',
          details: `📋 Action plan:\n${plan}`,
          tokenScope: 'llm:plan',
        });
      }

      // If there are org repos available, ask LLM to recommend relevant ones
      if (orgRepoNames.length > 0) {
        const llm = getLLM();
        const repoResponse = await llm.invoke([
          new SystemMessage(
            `You are a GitHub access manager. Given a new hire's role and a list of repos in the organisation, decide which repos they should have access to.
Return ONLY a JSON array of repo names from the provided list. Example: ["frontend-app","design-system"]
Only include repos that are genuinely relevant to this person's role. Do not invent repo names.`
          ),
          new HumanMessage(
            `New hire:
Name: ${newHire.firstName} ${newHire.lastName}
Role: ${newHire.role}
Team: ${newHire.team} Team
HR-requested repos: ${(newHire.githubRepos ?? []).join(', ') || 'none specified'}

Available repos in ${org}: ${orgRepoNames.join(', ')}

Which repos should this person have access to? Always include the HR-requested ones if they exist.`
          ),
        ]);

        const raw = typeof repoResponse.content === 'string' ? repoResponse.content : '';
        const jsonMatch = raw.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as string[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Only use repos that actually exist in the org
            const validated = parsed.filter((r) => orgRepoNames.includes(r));
            if (validated.length > 0) {
              reposToGrant = validated;
              auditEntries.push({
                timestamp: new Date(),
                action: 'AI repo selection complete',
                platform: 'github',
                details: `GPT-4o-mini selected ${validated.length} repos for ${newHire.role}: ${validated.join(', ')}`,
                tokenScope: 'llm:reasoning',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[github-agent] LLM reasoning failed, proceeding without it:', e);
    }

    // ── 3. Invite user to org ───────────────────────────────────────────────
    try {
      let inviteParams: Parameters<typeof octokit.rest.orgs.createInvitation>[0];
      if (newHire.githubUsername) {
        try {
          const { data: ghUser } = await octokit.rest.users.getByUsername({
            username: newHire.githubUsername,
          });
          inviteParams = { org, invitee_id: ghUser.id, role: 'direct_member' };
          auditEntries.push({
            timestamp: new Date(),
            action: 'GitHub user ID resolved',
            platform: 'github',
            details: `Resolved @${newHire.githubUsername} → GitHub user ID ${ghUser.id}`,
            tokenScope: 'github:read:user',
          });
        } catch {
          inviteParams = { org, email: newHire.personalEmail, role: 'direct_member' };
        }
      } else {
        inviteParams = { org, email: newHire.personalEmail, role: 'direct_member' };
      }

      await octokit.rest.orgs.createInvitation(inviteParams);
      auditEntries.push({
        timestamp: new Date(),
        action: 'GitHub org invitation sent',
        platform: 'github',
        details: `✅ Invited @${newHire.githubUsername || newHire.personalEmail} to ${org} as direct_member`,
        tokenScope: 'github:admin:org',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNonFatal =
        msg.includes('already a member') ||
        msg.includes('already been invited') ||
        msg.includes('is already') ||
        msg.includes('422');
      auditEntries.push({
        timestamp: new Date(),
        action: isNonFatal ? 'GitHub org invite skipped' : 'GitHub org invitation failed',
        platform: 'github',
        details: isNonFatal
          ? `@${newHire.githubUsername} is already a member or has a pending invite to ${org}`
          : `Could not invite to ${org}: ${msg}`,
        tokenScope: 'github:admin:org',
      });
    }

    // ── 4. Grant access to validated repos ─────────────────────────────────
    let reposGranted = 0;
    for (const repo of reposToGrant) {
      // Check if this repo actually exists in the org
      const repoExists = orgRepoNames.length === 0 || orgRepoNames.includes(repo);
      if (!repoExists) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'GitHub repo skipped',
          platform: 'github',
          details: `⚠️ ${org}/${repo} — repo does not exist in the org, skipping`,
          tokenScope: 'github:repo',
        });
        continue;
      }

      try {
        await octokit.rest.repos.addCollaborator({
          owner: org,
          repo,
          username: newHire.githubUsername,
          permission: 'push',
        });
        reposGranted++;
        auditEntries.push({
          timestamp: new Date(),
          action: 'GitHub repo access granted',
          platform: 'github',
          details: `✅ Granted push access to ${org}/${repo} for @${newHire.githubUsername}`,
          tokenScope: 'github:repo',
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        auditEntries.push({
          timestamp: new Date(),
          action: 'GitHub repo access pending',
          platform: 'github',
          details: `${org}/${repo} — ${msg.includes('Not Found') ? 'repo not found or insufficient access' : msg}`,
          tokenScope: 'github:repo',
        });
      }
    }

    await updateJobStep(
      jobId,
      'github',
      'completed',
      `Invited to ${org} + access to ${reposGranted}/${reposToGrant.length} repos`
    );

    return {
      steps: state.steps.map((s) =>
        s.platform === 'github' ? { ...s, status: 'completed' } : s
      ),
      auditLog: [...state.auditLog, ...auditEntries],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStep(jobId, 'github', 'failed', undefined, message);
    return {
      error: `GitHub agent failed: ${message}`,
      auditLog: [...state.auditLog, ...auditEntries],
    };
  }
}
