import { google } from 'googleapis';
import { AgentState, AuditEntry } from '../types';
import { getTokenFromMap } from '../auth0/token-vault';
import { updateJobStep } from '../store/jobs';
import { reasonAboutNewHire, getLLM } from './llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

type MeetingPlan = {
  title: string;
  dayOffset: number;
  durationMin: number;
  description: string;
  preferredHour?: number; // preferred start hour (9–17), agent will find free slot near this
};

/**
 * Find the next free time slot on a given day using Google's freebusy API.
 * Tries slots starting at preferredHour, then walks forward until a free window is found.
 */
async function findFreeSlot(
  calendar: ReturnType<typeof google.calendar>,
  date: Date,
  durationMin: number,
  preferredHour: number
): Promise<{ start: Date; end: Date } | null> {
  const dayStart = new Date(date);
  dayStart.setHours(9, 0, 0, 0); // working day starts at 09:00
  const dayEnd = new Date(date);
  dayEnd.setHours(18, 0, 0, 0); // working day ends at 18:00

  // Query freebusy for the whole day
  const freebusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  const busyPeriods = (freebusyRes.data.calendars?.primary?.busy ?? []).map((b) => ({
    start: new Date(b.start!),
    end: new Date(b.end!),
  }));

  // Walk through the day in 15-min increments starting from preferredHour
  const slotDuration = durationMin * 60 * 1000;
  let candidate = new Date(date);
  candidate.setHours(preferredHour, 0, 0, 0);

  // If preferred start is before working hours, snap to 09:00
  if (candidate < dayStart) candidate = new Date(dayStart);

  while (candidate.getTime() + slotDuration <= dayEnd.getTime()) {
    const slotEnd = new Date(candidate.getTime() + slotDuration);

    const overlaps = busyPeriods.some(
      (busy) => candidate < busy.end && slotEnd > busy.start
    );

    if (!overlaps) {
      return { start: new Date(candidate), end: slotEnd };
    }

    // Move forward 15 minutes and try again
    candidate = new Date(candidate.getTime() + 15 * 60 * 1000);
  }

  return null; // no free slot found on this day
}

export async function runCalendarAgent(state: AgentState): Promise<Partial<AgentState>> {
  const { jobId, newHire, tokenMap } = state;
  const auditEntries: AuditEntry[] = [];

  try {
    await updateJobStep(jobId, 'calendar', 'running');

    const { token, auditEntry } = getTokenFromMap(
      tokenMap,
      'google-calendar',
      `Schedule onboarding meetings for ${newHire.firstName} ${newHire.lastName}`
    );
    auditEntries.push(auditEntry);

    // ── LLM Reasoning + AI-generated meeting agenda ──────────────────────────
    let meetings: MeetingPlan[] = [
      {
        title: `Welcome 1:1 — ${newHire.firstName} & Manager`,
        dayOffset: 0, durationMin: 60, preferredHour: 10,
        description: 'First day welcome meeting. Cover team structure, immediate priorities, working style, and any questions.',
      },
      {
        title: `${newHire.team} Team Introduction`,
        dayOffset: 1, durationMin: 30, preferredHour: 14,
        description: 'Meet the team! Learn about current projects, ongoing initiatives, and team processes.',
      },
      {
        title: `Engineering Setup & Access Check-in`,
        dayOffset: 2, durationMin: 45, preferredHour: 11,
        description: 'Verify all systems are working correctly, review access levels, and answer any setup questions.',
      },
    ];

    try {
      const { reasoning, plan } = await reasonAboutNewHire(newHire, 'calendar');
      auditEntries.push({
        timestamp: new Date(),
        action: 'Calendar agent reasoning',
        platform: 'calendar',
        details: `🤖 ${reasoning}`,
        tokenScope: 'llm:reasoning',
      });
      if (plan) {
        auditEntries.push({
          timestamp: new Date(),
          action: 'Calendar agent action plan',
          platform: 'calendar',
          details: `📋 Action plan:\n${plan}`,
          tokenScope: 'llm:plan',
        });
      }

      // Ask LLM to generate 3 role-specific meetings as JSON
      const llm = getLLM();
      const meetingResponse = await llm.invoke([
        new SystemMessage(
          `You are a calendar scheduling agent. Generate exactly 3 onboarding meetings for a new hire.
Return ONLY a valid JSON array — no markdown, no code fences, no explanation. Format:
[{"title":"...","dayOffset":0,"durationMin":60,"preferredHour":10,"description":"..."},...]
dayOffset: 0=Day1,1=Day2,2=Day3. preferredHour: preferred start in 24h (9–17). durationMin: 30|45|60.
The agent will find the actual free slot near preferredHour automatically.`
        ),
        new HumanMessage(
          `Generate 3 onboarding meetings for:
Name: ${newHire.firstName} ${newHire.lastName}
Role: ${newHire.role}
Team: ${newHire.team} Team
Focus areas / repos: ${newHire.githubRepos.join(', ') || 'general engineering'}
Make meetings specific to their role and team. Include role-relevant topics in the description.`
        ),
      ]);

      const raw = typeof meetingResponse.content === 'string' ? meetingResponse.content : '';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as MeetingPlan[];
        if (Array.isArray(parsed) && parsed.length === 3) {
          meetings = parsed;
          auditEntries.push({
            timestamp: new Date(),
            action: 'Meetings personalised by AI',
            platform: 'calendar',
            details: `GPT-4o-mini generated role-specific meetings for ${newHire.firstName} (${newHire.role}): ${parsed.map(m => m.title).join(' · ')}`,
            tokenScope: 'llm:content',
          });
        }
      }
    } catch (e) {
      console.warn('[calendar-agent] LLM meeting generation failed, using defaults:', e);
    }
    // ────────────────────────────────────────────────────────────────────────

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth });

    const startDate = new Date(newHire.startDate);
    let scheduledCount = 0;

    for (const meeting of meetings) {
      const targetDay = new Date(startDate);
      targetDay.setDate(startDate.getDate() + meeting.dayOffset);

      const preferredHour = meeting.preferredHour ?? 10;

      // ── Check calendar free/busy and find an open slot ──────────────────
      let slot: { start: Date; end: Date } | null = null;
      try {
        slot = await findFreeSlot(calendar, targetDay, meeting.durationMin, preferredHour);

        auditEntries.push({
          timestamp: new Date(),
          action: 'Free/busy check complete',
          platform: 'calendar',
          details: slot
            ? `Found free slot on Day ${meeting.dayOffset + 1}: ${slot.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} – ${slot.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
            : `No free slot found on Day ${meeting.dayOffset + 1} — skipping "${meeting.title}"`,
          tokenScope: 'calendar:freebusy',
        });
      } catch (e) {
        // Fallback to preferred hour if freebusy fails
        const fallbackStart = new Date(targetDay);
        fallbackStart.setHours(preferredHour, 0, 0, 0);
        const fallbackEnd = new Date(fallbackStart.getTime() + meeting.durationMin * 60 * 1000);
        slot = { start: fallbackStart, end: fallbackEnd };
        auditEntries.push({
          timestamp: new Date(),
          action: 'Free/busy check failed — using preferred time',
          platform: 'calendar',
          details: `Freebusy API error, falling back to ${preferredHour}:00 for "${meeting.title}"`,
          tokenScope: 'calendar:freebusy',
        });
      }

      if (!slot) continue;

      // ── Create the calendar event ────────────────────────────────────────
      try {
        await calendar.events.insert({
          calendarId: 'primary',
          sendUpdates: 'all',
          requestBody: {
            summary: meeting.title,
            description: meeting.description,
            start: { dateTime: slot.start.toISOString(), timeZone: 'UTC' },
            end:   { dateTime: slot.end.toISOString(),   timeZone: 'UTC' },
            attendees: [{ email: newHire.personalEmail }],
          },
        });

        scheduledCount++;
        auditEntries.push({
          timestamp: new Date(),
          action: 'Calendar event created',
          platform: 'calendar',
          details: `✅ Scheduled "${meeting.title}" on Day ${meeting.dayOffset + 1} at ${slot.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} (${meeting.durationMin}min) — invite sent to ${newHire.personalEmail}`,
          tokenScope: 'calendar:events',
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        auditEntries.push({
          timestamp: new Date(),
          action: 'Calendar event failed',
          platform: 'calendar',
          details: `Could not create "${meeting.title}": ${msg}`,
          tokenScope: 'calendar:events',
        });
      }
    }

    await updateJobStep(
      jobId,
      'calendar',
      'completed',
      `${scheduledCount} onboarding meetings scheduled in free slots across first week`
    );

    return {
      steps: state.steps.map((s) =>
        s.platform === 'calendar' ? { ...s, status: 'completed' } : s
      ),
      auditLog: [...state.auditLog, ...auditEntries],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStep(jobId, 'calendar', 'failed', undefined, message);
    return {
      error: `Calendar agent failed: ${message}`,
      auditLog: [...state.auditLog, ...auditEntries],
    };
  }
}
