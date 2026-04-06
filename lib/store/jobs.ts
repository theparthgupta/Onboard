import { OnboardingJob, StepStatus, Platform, OnboardingStep, NewHireData } from '../types';

// In-memory store anchored to the Node.js global object so it is shared
// across Next.js route-handler module instances in the same process.
declare global {
  // eslint-disable-next-line no-var
  var __jobStore: Map<string, OnboardingJob> | undefined;
}
if (!globalThis.__jobStore) {
  globalThis.__jobStore = new Map<string, OnboardingJob>();
}
const jobStore = globalThis.__jobStore;

export function createJob(job: OnboardingJob): void {
  jobStore.set(job.id, job);
}

export function getJob(id: string): OnboardingJob | undefined {
  return jobStore.get(id);
}

export function getAllJobs(): OnboardingJob[] {
  return Array.from(jobStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateJobStep(
  jobId: string,
  platform: Platform,
  status: StepStatus,
  result?: string,
  error?: string
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  job.steps = job.steps.map((step) =>
    step.platform === platform
      ? {
          ...step,
          status,
          result,
          error,
          startedAt: status === 'running' ? new Date() : step.startedAt,
          completedAt: ['completed', 'failed'].includes(status) ? new Date() : step.completedAt,
        }
      : step
  );

  jobStore.set(jobId, job);
}

export async function updateJobStatus(
  jobId: string,
  status: OnboardingJob['status']
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;
  job.status = status;
  if (status === 'completed') job.completedAt = new Date();
  jobStore.set(jobId, job);
}

export async function updateJobCIBARequest(
  jobId: string,
  cibaRequestId: string
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;
  job.cibaRequestId = cibaRequestId;
  jobStore.set(jobId, job);
}

export async function appendAuditEntry(
  jobId: string,
  entry: OnboardingJob['auditLog'][0]
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;
  job.auditLog.push(entry);
  jobStore.set(jobId, job);
}

export function initializeJobSteps(newHire: NewHireData): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    { platform: 'github', label: 'GitHub Access', status: 'pending' },
    { platform: 'slack', label: 'Slack Workspace', status: 'pending' },
    { platform: 'gmail', label: 'Welcome Email', status: 'pending' },
    { platform: 'calendar', label: 'Onboarding Meetings', status: 'pending' },
  ];

  if (newHire.requiresProductionAccess) {
    steps.push({
      platform: 'production',
      label: 'Production Access (Requires Approval)',
      status: 'pending',
    });
  }

  return steps;
}
