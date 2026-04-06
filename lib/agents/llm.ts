import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { NewHireData } from '../types';

/** Shared LLM instance — GPT-4o-mini for fast, cheap agent reasoning */
export function getLLM() {
  return new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Ask the LLM to analyse a new hire and produce a structured action plan
 * for a given platform. Returns a plain-text reasoning block.
 */
export async function reasonAboutNewHire(
  newHire: NewHireData,
  platform: 'github' | 'slack' | 'gmail' | 'calendar',
): Promise<{ reasoning: string; plan: string }> {
  const llm = getLLM();

  const platformContext: Record<typeof platform, string> = {
    github: `You are the GitHub provisioning agent.
Your job: decide exactly which actions to take on GitHub for this new hire.
Consider their role, team, and the repos listed. Think about whether the invite
should be by username or email, and flag any potential issues.`,
    slack: `You are the Slack provisioning agent.
Your job: decide how to onboard this person into the Slack workspace.
Consider their role and team to determine if the listed channels are appropriate,
and suggest any additional standard channels they should join.`,
    gmail: `You are the Welcome Email agent.
Your job: plan the welcome email for this new hire.
Personalise the message tone to their role and team.
Note any key items to highlight (GitHub access, Slack channels, calendar events).`,
    calendar: `You are the Calendar scheduling agent.
Your job: plan 3 onboarding meetings for the new hire's first week.
Consider their role, team, and start date to propose appropriate meeting titles,
durations, and descriptions. Ensure the schedule is realistic.`,
  };

  const response = await llm.invoke([
    new SystemMessage(platformContext[platform]),
    new HumanMessage(`
New hire details:
- Name: ${newHire.firstName} ${newHire.lastName}
- Role: ${newHire.role}
- Team: ${newHire.team} Team
- Work email: ${newHire.email}
- Personal email: ${newHire.personalEmail}
- GitHub username: ${newHire.githubUsername}
- Start date: ${newHire.startDate}
- GitHub repos requested: ${newHire.githubRepos.join(', ') || 'none'}
- Slack channels requested: ${newHire.slackChannels.join(', ') || 'none'}
- Requires production access: ${newHire.requiresProductionAccess ? 'YES' : 'No'}

First, share your brief reasoning (2-3 sentences) about this person's onboarding needs.
Then write a concise action plan (bullet points) for the ${platform} provisioning.
Format:
REASONING: <your analysis>
PLAN:
• <action 1>
• <action 2>
...`),
  ]);

  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  const reasoningMatch = text.match(/REASONING:\s*([\s\S]*?)(?=PLAN:|$)/i);
  const planMatch = text.match(/PLAN:\s*([\s\S]*)/i);

  return {
    reasoning: reasoningMatch?.[1]?.trim() ?? text,
    plan: planMatch?.[1]?.trim() ?? '',
  };
}
