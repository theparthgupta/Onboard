/* eslint-disable @typescript-eslint/no-explicit-any */
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { AgentState, NewHireData, OnboardingStep, AuditEntry, Platform, TokenEntry } from '../types';
import { runGitHubAgent } from './github-agent';
import { runSlackAgent } from './slack-agent';
import { runGmailAgent } from './gmail-agent';
import { runCalendarAgent } from './calendar-agent';
import { runProductionAgent } from './production-agent';

/**
 * Multi-agent orchestration graph — TRUE PARALLEL execution.
 *
 * Architecture:
 *   START ──┬──► github ──┐
 *           ├──► slack   ─┼──► finish ──► (production?) ──► END
 *           ├──► gmail   ─┤
 *           └──► calendar─┘
 *
 * All 4 agents run concurrently. LangGraph waits for all to complete
 * before the finish node runs. State is merged via reducers.
 *
 * Security model:
 * - No shared credential holder
 * - Each agent reads only its own scoped token from tokenMap
 * - Production agent has ZERO credentials — triggers CIBA only
 */

const AgentStateAnnotation = Annotation.Root({
  jobId: Annotation<string>({
    value: (_, b) => b,
    default: () => '',
  }),
  newHire: Annotation<NewHireData | null>({
    value: (_, b) => b,
    default: () => null,
  }),
  userId: Annotation<string>({
    value: (_, b) => b,
    default: () => '',
  }),
  tokenMap: Annotation<Record<string, TokenEntry>>({
    value: (_, b) => b,
    default: () => ({}),
  }),

  // ── Merge reducer: append audit entries from all parallel agents ──────────
  auditLog: Annotation<AuditEntry[]>({
    value: (existing: AuditEntry[], incoming: AuditEntry[]) => {
      if (!incoming?.length) return existing ?? [];
      return [...(existing ?? []), ...incoming];
    },
    default: () => [],
  }),

  // ── Merge reducer: update steps by platform (parallel agents write their own step) ─
  steps: Annotation<OnboardingStep[]>({
    value: (existing: OnboardingStep[], incoming: OnboardingStep[]) => {
      if (!incoming?.length) return existing ?? [];
      const merged = [...(existing ?? [])];
      for (const step of incoming) {
        const idx = merged.findIndex((s) => s.platform === step.platform);
        if (idx >= 0) merged[idx] = step;
        else merged.push(step);
      }
      return merged;
    },
    default: () => [],
  }),

  currentStep: Annotation<Platform | null>({
    value: (_, b) => b,
    default: () => null,
  }),
  error: Annotation<string | undefined>({
    // Concatenate errors from parallel agents (if any)
    value: (a: string | undefined, b: string | undefined) => {
      if (!a && !b) return undefined;
      if (!a) return b;
      if (!b) return a;
      return `${a} | ${b}`;
    },
    default: () => undefined,
  }),
});

type GraphState = typeof AgentStateAnnotation.State;

function toAgentState(s: GraphState): AgentState {
  return s as unknown as AgentState;
}

/** Passthrough finish node — just a convergence point after all parallel agents complete */
function finishNode(s: GraphState): Partial<GraphState> {
  return { currentStep: null };
}

function createOnboardingGraph() {
  const compiled = (new StateGraph(AgentStateAnnotation) as any)
    // ── Nodes ────────────────────────────────────────────────────────────────
    .addNode('github',     (s: GraphState) => runGitHubAgent(toAgentState(s)))
    .addNode('slack',      (s: GraphState) => runSlackAgent(toAgentState(s)))
    .addNode('gmail',      (s: GraphState) => runGmailAgent(toAgentState(s)))
    .addNode('calendar',   (s: GraphState) => runCalendarAgent(toAgentState(s)))
    .addNode('finish',     finishNode)
    .addNode('production', (s: GraphState) => runProductionAgent(toAgentState(s)))

    // ── Fan-out: START → all 4 agents in parallel ────────────────────────────
    .addEdge(START, 'github')
    .addEdge(START, 'slack')
    .addEdge(START, 'gmail')
    .addEdge(START, 'calendar')

    // ── Fan-in: all 4 agents → finish (LangGraph waits for all before continuing)
    .addEdge('github',   'finish')
    .addEdge('slack',    'finish')
    .addEdge('gmail',    'finish')
    .addEdge('calendar', 'finish')

    // ── After finish: optionally trigger CIBA for production access ──────────
    .addConditionalEdges('finish', (s: GraphState) => {
      if (s.newHire?.requiresProductionAccess) return 'production';
      return END;
    })
    .addEdge('production', END)
    .compile();

  return compiled;
}

export const onboardingGraph = createOnboardingGraph();
