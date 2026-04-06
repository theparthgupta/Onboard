'use client';

import { useEffect, useState, useCallback } from 'react';
import { OnboardingJob } from '@/lib/types';
import { PlatformStep } from './PlatformStep';
import { CIBAApprovalBanner } from './CIBAApprovalBanner';
import { AuditLog } from './AuditLog';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function StatusPill({ status }: { status: OnboardingJob['status'] }) {
  const map = {
    queued:        { dot: 'bg-[#333]',               text: 'Queued',            label: 'text-[#555]' },
    running:       { dot: 'bg-white animate-pulse',   text: 'Running',           label: 'text-[#888]' },
    awaiting_ciba: { dot: 'bg-amber-400 animate-pulse', text: 'Awaiting approval', label: 'text-amber-400' },
    completed:     { dot: 'bg-emerald-400',           text: 'Completed',         label: 'text-emerald-400' },
    failed:        { dot: 'bg-red-400',               text: 'Failed',            label: 'text-red-400' },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium ${s.label}`}>{s.text}</span>
    </span>
  );
}

export function ProvisioningStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<OnboardingJob | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/onboard/${jobId}`);
      if (res.ok) setJob(await res.json());
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(async () => {
      const res = await fetch(`/api/onboard/${jobId}`);
      if (res.ok) {
        const data: OnboardingJob = await res.json();
        setJob(data);
        if (data.status === 'completed' || data.status === 'failed') clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, fetchJob]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="text-[#333] animate-spin" size={24} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-24">
        <p className="text-[#444] text-sm">Job not found.</p>
      </div>
    );
  }

  const completedSteps = job.steps.filter(s => s.status === 'completed').length;
  const totalSteps = job.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const newHireName = `${job.newHire.firstName} ${job.newHire.lastName}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#f0f0f0] tracking-tight">{newHireName}</h1>
          <p className="text-sm text-[#555] mt-0.5">{job.newHire.role} · {job.newHire.team} Team</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={job.status} />
          <p className="text-[10px] text-[#333] font-mono">
            {new Date(job.createdAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#444]">{completedSteps} / {totalSteps} platforms</span>
          <span className="text-[11px] font-mono text-[#555]">{progressPct}%</span>
        </div>
        <div className="h-px bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#f0f0f0] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* CIBA */}
      {job.status === 'awaiting_ciba' && (
        <CIBAApprovalBanner jobId={jobId} newHireName={newHireName} />
      )}

      {/* Steps */}
      <div className="space-y-2">
        {job.steps.map(step => <PlatformStep key={step.platform} step={step} />)}
      </div>

      {/* Completion */}
      {job.status === 'completed' && (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-5 text-center">
          <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
          <h3 className="text-[#f0f0f0] font-medium">Onboarding Complete</h3>
          <p className="text-[#555] text-xs mt-1">
            {newHireName} provisioned across all platforms.
            {job.completedAt && (
              <span className="ml-1 text-[#444]">
                {Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000)}s total
              </span>
            )}
          </p>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-5 text-center">
          <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
          <h3 className="text-red-400 font-medium">Onboarding Failed</h3>
          <p className="text-[#555] text-xs mt-1">Check the audit trail for details.</p>
        </div>
      )}

      {/* Audit log */}
      {job.auditLog.length > 0 && <AuditLog entries={job.auditLog} />}
    </div>
  );
}
