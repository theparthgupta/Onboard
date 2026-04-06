import Link from 'next/link';
import { OnboardingJob } from '@/lib/types';
import { GitBranch, MessageSquare, Mail, CalendarDays, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS = {
  github:     GitBranch,
  slack:      MessageSquare,
  gmail:      Mail,
  calendar:   CalendarDays,
  production: Shield,
};

function statusDot(status: OnboardingJob['status']) {
  switch (status) {
    case 'completed':     return 'bg-emerald-400';
    case 'failed':        return 'bg-red-400';
    case 'running':       return 'bg-white animate-pulse';
    case 'awaiting_ciba': return 'bg-amber-400 animate-pulse';
    default:              return 'bg-[#333]';
  }
}

function statusLabel(status: OnboardingJob['status']) {
  switch (status) {
    case 'completed':     return { text: 'Complete',  cls: 'text-emerald-400' };
    case 'failed':        return { text: 'Failed',    cls: 'text-red-400' };
    case 'running':       return { text: 'Running',   cls: 'text-[#888]' };
    case 'awaiting_ciba': return { text: 'Approving', cls: 'text-amber-400' };
    default:              return { text: 'Queued',    cls: 'text-[#444]' };
  }
}

function stepColor(status: string) {
  switch (status) {
    case 'completed':         return 'text-emerald-500';
    case 'running':           return 'text-[#888]';
    case 'awaiting_approval': return 'text-amber-500';
    case 'failed':            return 'text-red-500';
    default:                  return 'text-[#2a2a2a]';
  }
}

export function JobCard({ job }: { job: OnboardingJob }) {
  const completedSteps = job.steps.filter(s => s.status === 'completed').length;
  const totalSteps = job.steps.length;
  const pct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const { text: sText, cls: sCls } = statusLabel(job.status);

  return (
    <Link href={`/onboard/${job.id}`} className="block group">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#141414] transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-[#e0e0e0] group-hover:text-white transition-colors truncate">
              {job.newHire.firstName} {job.newHire.lastName}
            </h3>
            <p className="text-xs text-[#444] mt-0.5 truncate">
              {job.newHire.role} · {job.newHire.team}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDot(job.status))} />
              <span className={cn('text-[11px] font-medium', sCls)}>{sText}</span>
            </span>
            <ArrowRight size={13} className="text-[#2a2a2a] group-hover:text-[#444] group-hover:translate-x-0.5 transition-all duration-150" />
          </div>
        </div>

        {/* Platform icons */}
        <div className="flex items-center gap-1.5 mb-3">
          {job.steps.map(step => {
            const Icon = PLATFORM_ICONS[step.platform];
            return (
              <div key={step.platform} className="w-6 h-6 rounded-md bg-[#1a1a1a] border border-[#222] flex items-center justify-center" title={`${step.label}: ${step.status}`}>
                <Icon size={11} className={stepColor(step.status)} />
              </div>
            );
          })}
          <span className="ml-auto text-[10px] text-[#333] font-mono">{completedSteps}/{totalSteps}</span>
        </div>

        {/* Progress bar */}
        <div className="h-px bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              job.status === 'completed' ? 'bg-emerald-500' :
              job.status === 'failed'    ? 'bg-red-500' : 'bg-[#444]'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Footer */}
        <p className="text-[10px] text-[#333] font-mono">
          {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </Link>
  );
}
