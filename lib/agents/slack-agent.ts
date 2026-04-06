import { WebClient } from '@slack/web-api';
import { AgentState, AuditEntry } from '../types';
import { getTokenFromMap } from '../auth0/token-vault';
import { updateJobStep } from '../store/jobs';
import { reasonAboutNewHire, getLLM } from './llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export async function runSlackAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, newHire, tokenMap } = state;
  const auditEntries: AuditEntry[] = [];

  try {
    await updateJobStep(jobId, 'slack', 'running');

    const { token, auditEntry } = getTokenFromMap(
      tokenMap,
      'slack',
      `Invite ${newHire.personalEmail} to Slack and add to ${newHire.slackChannels?.length ?? 0} channels`
    );
    auditEntries.push(auditEntry);

    // ── LLM: Reason + suggest extra channels based on role ─────────────────
    let extraChannels: string[] = [];
    try {
      const { reasoning, plan } = await reasonAboutNewHire(newHire, 'slack');
      auditEntries.push({
        timestamp: new Date(),
        action: 'Slack agent reasoning',
        platform: 'slack',
        details: `🤖 ${reasoning}`,
        tokenScope: 'llm:reasoning',
      });
      if (plan) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'Slack agent action plan',
          platform: 'slack',
          details: `📋 Action plan:\n${plan}`,
          tokenScope: 'llm:plan',
        });
      }

      // Ask LLM to suggest additional channels based on role
      const llm = getLLM();
      const channelResponse = await llm.invoke([
        new SystemMessage(
          `You are a Slack workspace manager. Based on a new hire's role and team, suggest additional Slack channel names they should join beyond what HR specified.
Return ONLY a JSON array of lowercase channel names (no #, no spaces, use hyphens). Max 3 suggestions. Example: ["design-feedback","product-roadmap","api-discussions"]
Only suggest channels that are genuinely relevant. If none are needed, return [].`
        ),
        new HumanMessage(
          `New hire details:
Name: ${newHire.firstName} ${newHire.lastName}
Role: ${newHire.role}
Team: ${newHire.team} Team
GitHub repos: ${(newHire.githubRepos ?? []).join(', ') || 'none'}
Already being added to: ${(newHire.slackChannels ?? []).join(', ')}

Suggest additional relevant channels for this role.`
        ),
      ]);

      const raw = typeof channelResponse.content === 'string' ? channelResponse.content : '';
      const jsonMatch = raw.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as string[];
        if (Array.isArray(parsed)) {
          // Only use channels not already in the list
          extraChannels = parsed
            .filter((c) => typeof c === 'string')
            .map((c) => c.replace(/^#/, '').toLowerCase())
            .filter((c) => !newHire.slackChannels.includes(c))
            .slice(0, 3);

          if (extraChannels.length > 0) {
            auditEntries.push({
              timestamp: new Date(),
              action: 'AI recommended additional channels',
              platform: 'slack',
              details: `GPT-4o-mini suggested: ${extraChannels.map(c => '#' + c).join(', ')} for ${newHire.role}`,
              tokenScope: 'llm:reasoning',
            });
          }
        }
      }
    } catch (e) {
      console.warn('[slack-agent] LLM reasoning failed, proceeding without it:', e);
    }
    // ────────────────────────────────────────────────────────────────────────

    const slack = new WebClient(token);
    const allChannels = [...(newHire.slackChannels ?? []), ...extraChannels];

    // 1. Invite user to workspace
    try {
      await (slack as any).users.admin.invite({
        email: newHire.personalEmail,
        first_name: newHire.firstName,
        last_name: newHire.lastName,
      });
      auditEntries.push({
        timestamp: new Date(),
        action: 'Slack workspace invitation sent',
        platform: 'slack',
        details: `Invited ${newHire.personalEmail} to Slack workspace`,
        tokenScope: 'slack:users:write',
      });
    } catch {
      auditEntries.push({
        timestamp: new Date(),
        action: 'Slack workspace invitation queued',
        platform: 'slack',
        details: `Admin invite sent — user will receive email to join workspace`,
        tokenScope: 'slack:users:write',
      });
    }

    // 2. Look up existing Slack user by email
    let slackUserId: string | null = null;
    try {
      const userResult = await slack.users.lookupByEmail({ email: newHire.personalEmail });
      slackUserId = userResult.user?.id ?? null;
      if (slackUserId) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'Slack user found',
          platform: 'slack',
          details: `Resolved ${newHire.personalEmail} → Slack user ID ${slackUserId}`,
          tokenScope: 'slack:users:read',
        });
      }
    } catch {
      auditEntries.push({
        timestamp: new Date(),
        action: 'Slack user lookup pending',
        platform: 'slack',
        details: `${newHire.personalEmail} not yet in workspace — channel invites will apply once they accept the workspace invite`,
        tokenScope: 'slack:users:read',
      });
    }

    // 3. Fetch all public channels once
    const channelList = await slack.conversations.list({ types: 'public_channel', limit: 200 });
    const channelMap = new Map(
      (channelList.channels ?? []).map((c) => [c.name, c.id])
    );

    // 4. Add user to each channel (HR-specified + AI-recommended)
    const joinedChannels: string[] = [];
    for (const channelName of allChannels) {
      const channelId = channelMap.get(channelName);
      if (!channelId) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'Slack channel not found',
          platform: 'slack',
          details: `#${channelName} — channel doesn't exist in this workspace`,
          tokenScope: 'slack:channels:read',
        });
        continue;
      }

      if (slackUserId) {
        try {
          await slack.conversations.invite({ channel: channelId, users: slackUserId });
          joinedChannels.push(channelName);
          auditEntries.push({
            timestamp: new Date(),
            action: 'Added to Slack channel',
            platform: 'slack',
            details: `✅ Added ${newHire.firstName} (${slackUserId}) to #${channelName}`,
            tokenScope: 'slack:channels:manage',
          });
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          auditEntries.push({
            timestamp: new Date(),
            action: 'Slack channel invite skipped',
            platform: 'slack',
            details: `#${channelName} — ${errMsg.includes('already_in_channel') ? 'already a member' : errMsg}`,
            tokenScope: 'slack:channels:manage',
          });
          if (errMsg.includes('already_in_channel')) joinedChannels.push(channelName);
        }
      } else {
        auditEntries.push({
          timestamp: new Date(),
          action: 'Slack channel invite queued',
          platform: 'slack',
          details: `#${channelName} — queued for when ${newHire.personalEmail} accepts workspace invite`,
          tokenScope: 'slack:channels:manage',
        });
      }
    }

    // 5. Post a welcome message to #general (or first joined channel)
    const welcomeTarget = channelMap.get('general') ?? (joinedChannels.length > 0 ? channelMap.get(joinedChannels[0]) : null);
    if (welcomeTarget) {
      try {
        await slack.chat.postMessage({
          channel: welcomeTarget,
          text: `👋 Welcome to the team, <@${slackUserId ?? newHire.firstName}>! 🎉`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Welcome ${newHire.firstName} ${newHire.lastName}!* 🎉\nThey're joining as *${newHire.role}* on the *${newHire.team}* team. Please give them a warm welcome!`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `🚀 Provisioned by Onboard · GitHub · Slack · Gmail · Calendar`,
                },
              ],
            },
          ],
        });
        auditEntries.push({
          timestamp: new Date(),
          action: 'Welcome message posted',
          platform: 'slack',
          details: `✅ Posted welcome message for ${newHire.firstName} in #${joinedChannels[0] ?? 'general'}`,
          tokenScope: 'slack:chat:write',
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        auditEntries.push({
          timestamp: new Date(),
          action: 'Welcome message skipped',
          platform: 'slack',
          details: `Could not post welcome message: ${msg}`,
          tokenScope: 'slack:chat:write',
        });
      }
    }

    await updateJobStep(
      jobId,
      'slack',
      'completed',
      `Invited to workspace + added to ${joinedChannels.length}/${allChannels.length} channels${extraChannels.length > 0 ? ` (${extraChannels.length} AI-recommended)` : ''}`
    );

    return {
      steps: state.steps.map((s) =>
        s.platform === 'slack' ? { ...s, status: 'completed' } : s
      ),
      auditLog: [...state.auditLog, ...auditEntries],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStep(jobId, 'slack', 'failed', undefined, message);
    return {
      error: `Slack agent failed: ${message}`,
      auditLog: [...state.auditLog, ...auditEntries],
    };
  }
}
