export type Platform = 'github' | 'slack' | 'gmail' | 'calendar' | 'production';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval';

export interface OnboardingStep {
  platform: Platform;
  label: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
}

export interface NewHireData {
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string;
  role: string;
  team: string;
  githubUsername: string;
  startDate: string;
  managerId: string;
  requiresProductionAccess: boolean;
  githubRepos: string[];
  slackChannels: string[];
}

export interface OnboardingJob {
  id: string;
  createdAt: Date;
  createdBy: string;
  newHire: NewHireData;
  status: 'queued' | 'running' | 'awaiting_ciba' | 'completed' | 'failed';
  steps: OnboardingStep[];
  cibaRequestId?: string;
  completedAt?: Date;
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  platform: Platform | 'system';
  details: string;
  tokenScope?: string;
  approved?: boolean;
}

export interface TokenEntry {
  token: string;
  source: 'token-vault' | 'fallback';
}

export interface AgentState {
  jobId: string;
  newHire: NewHireData;
  userId: string;
  tokenMap: Record<string, TokenEntry>; // Pre-fetched tokens keyed by service, with source info
  steps: OnboardingStep[];
  auditLog: AuditEntry[];
  currentStep: Platform | null;
  error?: string;
}
