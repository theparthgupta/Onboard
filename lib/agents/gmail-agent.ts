import { google } from 'googleapis';
import { AgentState, AuditEntry, NewHireData } from '../types';
import { getTokenFromMap } from '../auth0/token-vault';
import { updateJobStep } from '../store/jobs';
import { reasonAboutNewHire, getLLM } from './llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export async function runGmailAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, newHire, tokenMap } = state;
  const auditEntries: AuditEntry[] = [];

  try {
    await updateJobStep(jobId, 'gmail', 'running');

    const { token, auditEntry } = getTokenFromMap(
      tokenMap,
      'google-gmail',
      `Send welcome email to ${newHire.firstName} ${newHire.lastName}`
    );
    auditEntries.push(auditEntry);

    // ── LLM Reasoning + AI-personalised email body ───────────────────────────
    let emailBodyOverride: string | null = null;
    try {
      const { reasoning, plan } = await reasonAboutNewHire(newHire, 'gmail');
      auditEntries.push({
        timestamp: new Date(),
        action: 'Gmail agent reasoning',
        platform: 'gmail',
        details: `🤖 ${reasoning}`,
        tokenScope: 'llm:reasoning',
      });
      if (plan) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'Gmail agent action plan',
          platform: 'gmail',
          details: `📋 Action plan:\n${plan}`,
          tokenScope: 'llm:plan',
        });
      }

      // Ask LLM to write a personalised HTML welcome email body
      const llm = getLLM();
      const emailResponse = await llm.invoke([
        new SystemMessage(
          `You are writing a warm, professional onboarding welcome email in HTML.
Keep it concise (under 300 words). Return ONLY valid HTML — no markdown, no code fences.
Style inline: dark card background #0f172a, text #f8fafc, accent #3b82f6, border-radius 12px, padding 40px.`
        ),
        new HumanMessage(
          `Write a personalised welcome email body for:
Name: ${newHire.firstName} ${newHire.lastName}
Role: ${newHire.role} on the ${newHire.team} Team
Start date: ${newHire.startDate}
GitHub repos granted: ${newHire.githubRepos.join(', ') || 'none'}
Slack channels: #${newHire.slackChannels.join(', #') || 'general'}
Calendar: 3 onboarding meetings scheduled for the first week.
Make it personal, warm, and mention their specific role and team.`
        ),
      ]);

      const emailHtml =
        typeof emailResponse.content === 'string'
          ? emailResponse.content
          : JSON.stringify(emailResponse.content);

      if (emailHtml && emailHtml.includes('<')) {
        emailBodyOverride = emailHtml;
        auditEntries.push({
          timestamp: new Date(),
          action: 'Welcome email personalised by AI',
          platform: 'gmail',
          details: `GPT-4o-mini crafted a personalised welcome email for ${newHire.firstName} (${newHire.role}, ${newHire.team} Team)`,
          tokenScope: 'llm:content',
        });
      }
    } catch (e) {
      console.warn('[gmail-agent] LLM personalisation failed, falling back to template:', e);
    }
    // ────────────────────────────────────────────────────────────────────────

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: 'v1', auth });

    const emailBody = emailBodyOverride ?? generateWelcomeEmail(newHire);
    const rawEmail = [
      `To: ${newHire.personalEmail}`,
      `Subject: Welcome to the team, ${newHire.firstName}! 🎉`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      emailBody,
    ].join('\r\n');

    const encodedEmail = Buffer.from(rawEmail).toString('base64url');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedEmail },
    });

    auditEntries.push({
      timestamp: new Date(),
      action: 'Welcome email sent',
      platform: 'gmail',
      details: `AI-personalised welcome email delivered to ${newHire.personalEmail}`,
      tokenScope: 'gmail:send',
    });

    await updateJobStep(
      jobId,
      'gmail',
      'completed',
      `Welcome email sent to ${newHire.personalEmail}`
    );

    return {
      steps: state.steps.map((s) =>
        s.platform === 'gmail' ? { ...s, status: 'completed' } : s
      ),
      auditLog: [...state.auditLog, ...auditEntries],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStep(jobId, 'gmail', 'failed', undefined, message);
    return {
      error: `Gmail agent failed: ${message}`,
      auditLog: [...state.auditLog, ...auditEntries],
    };
  }
}

function generateWelcomeEmail(newHire: NewHireData): string {
  const startDateFormatted = new Date(newHire.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
  <div style="margin-bottom: 32px;">
    <div style="background: #3b82f6; width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
      <span style="color: white; font-size: 24px;">👋</span>
    </div>
    <h1 style="color: #f8fafc; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">
      Welcome, ${newHire.firstName}!
    </h1>
    <p style="color: #94a3b8; font-size: 16px; margin: 0;">
      We're thrilled to have you join as <strong style="color: #f8fafc;">${newHire.role}</strong> on the <strong style="color: #f8fafc;">${newHire.team}</strong>.
    </p>
  </div>

  <div style="background: #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="color: #f8fafc; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">What's been set up for you</h2>
    <ul style="list-style: none; padding: 0; margin: 0; space-y: 12px;">
      <li style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-bottom: 1px solid #334155;">
        <span>✅</span>
        <div>
          <strong style="color: #f8fafc;">GitHub</strong>
          <span style="color: #94a3b8; display: block; font-size: 14px;">Invited to organization · Repo access granted</span>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-bottom: 1px solid #334155;">
        <span>✅</span>
        <div>
          <strong style="color: #f8fafc;">Slack</strong>
          <span style="color: #94a3b8; display: block; font-size: 14px;">Workspace invite sent · Added to team channels</span>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0;">
        <span>📅</span>
        <div>
          <strong style="color: #f8fafc;">Calendar</strong>
          <span style="color: #94a3b8; display: block; font-size: 14px;">Onboarding 1:1s scheduled for your first week</span>
        </div>
      </li>
    </ul>
  </div>

  <div style="background: #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 4px 0;">Your start date</p>
    <p style="color: #f8fafc; font-size: 18px; font-weight: 600; margin: 0;">${startDateFormatted}</p>
  </div>

  <p style="color: #94a3b8; font-size: 14px; margin: 0;">
    This message was sent automatically by Onboard. All access was provisioned with explicit scoped permissions and manager approval where required.
  </p>
</div>
`.trim();
}
