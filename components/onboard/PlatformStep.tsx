import { OnboardingStep, StepStatus } from '@/lib/types';
import { GitBranch, MessageSquare, Mail, CalendarDays, Shield, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_META = {
  github:     { icon: GitBranch,    label: 'GitHub' },
  slack:      { icon: MessageSquare, label: 'Slack' },
  gmail:      { icon: Mail,         label: 'Gmail' },
  calendar:   { icon: CalendarDays, label: 'Calendar' },
  production: { icon: Shield,       label: 'Production' },
};

function StatusDot({ status }: { status: StepStatus }) {
  if (status === 'completed') return <Check size={13} className="text-emerald-400 flex-shrink-0" />;
  if (status === 'failed')    return <X     size={13} className="text-red-400 flex-shrink-0" />;
  if (status === 'running')   return <Loader2 size={13} className="text-[#888] animate-spin flex-shrink-0" />;
  if (status === 'awaiting_approval') return (
    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0 mt-0.5" />
  );
  return <span className="w-2 h-2 rounded-full border border-[#333] flex-shrink-0 mt-0.5" />;
}

function statusText(status: StepStatus): { text: string; cls: string } {
  switch (status) {
    case 'pending':           return { text: 'Pending',           cls: 'text-[#444]' };
    case 'running':           return { text: 'Running',           cls: 'text-[#888]' };
    case 'completed':         return { text: 'Complete',          cls: 'text-emerald-400' };
    case 'failed':            return { text: 'Failed',            cls: 'text-red-400' };
    case 'awaiting_approval': return { text: 'Awaiting approval', cls: 'text-amber-400' };
  }
}

export function PlatformStep({ step }: { step: OnboardingStep }) {
  const meta = PLATFORM_META[step.platform];
  const Icon = meta.icon;
  const { text, cls } = statusText(step.status);
  const isActive = step.status === 'running' || step.status === 'awaiting_approval';
  const isDone   = step.status === 'completed';
  const isFailed = step.status === 'failed';

  return (
    <div className={cn(
      'flex items-start gap-4 p-4 rounded-xl border transition-all duration-300',
      isDone   ? 'border-[#1e1e1e] bg-[#0f0f0f]' :
      isFailed ? 'border-red-900/30 bg-red-950/10' :
      isActive ? 'border-[#2a2a2a] bg-[#111]' :
                 'border-[#161616] bg-[#0a0a0a]'
    )}>
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors duration-300',
        isDone   ? 'border-[#222] bg-[#161616]' :
        isActive ? 'border-[#2a2a2a] bg-[#1a1a1a]' :
                   'border-[#1a1a1a] bg-[#111]'
      )}>
        <Icon size={15} className={cn(
          'transition-colors duration-300',
          isDone   ? 'text-[#555]' :
          isActive ? 'text-[#888]' :
          isFailed ? 'text-red-500' :
                     'text-[#333]'
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-0.5">
          <span className={cn(
            'text-sm font-medium transition-colors duration-200',
            isDone || isActive ? 'text-[#f0f0f0]' : 'text-[#555]'
          )}>
            {step.label}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusDot status={step.status} />
            <span className={cn('text-xs', cls)}>{text}</span>
          </div>
        </div>

        {step.result && (
          <p className="text-xs text-[#555] mt-1 leading-relaxed">{step.result}</p>
        )}
        {step.error && (
          <p className="text-xs text-red-500/70 mt-1 leading-relaxed">{step.error}</p>
        )}
        {step.status === 'pending' && (
          <p className="text-xs text-[#333] mt-0.5">Waiting…</p>
        )}
        {step.completedAt && step.startedAt && (
          <p className="text-xs text-[#333] mt-1">
            {((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
}
