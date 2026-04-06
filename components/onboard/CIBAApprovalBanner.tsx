'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CIBAApprovalBannerProps {
  jobId: string;
  newHireName: string;
  expiresAt?: Date;
}

export function CIBAApprovalBanner({ jobId, newHireName, expiresAt }: CIBAApprovalBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  async function handleResend() {
    setResending(true);
    try {
      await fetch(`/api/onboard/${jobId}/resend-ciba`, { method: 'POST' });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } finally {
      setResending(false);
    }
  }

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/5">
      {/* Animated glow border */}
      <div className="absolute inset-0 rounded-xl border border-amber-400/20 animate-pulse" />

      <div className="relative p-5 md:p-6">
        <div className="flex items-start gap-4">
          {/* Pulsing icon */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
            <div className="relative w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert size={22} className="text-amber-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-amber-300 mb-1">
                  Production Access Approval Required
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                  Onboard has <span className="text-amber-300 font-semibold">paused</span>. A push notification
                  has been sent to the manager's <span className="text-white font-medium">Auth0 Guardian app</span>{' '}
                  requesting approval to grant <span className="text-white font-medium">{newHireName}</span> production
                  access. The agent will continue automatically once approved.
                </p>
              </div>

              {secondsLeft !== null && secondsLeft > 0 && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-500 mb-0.5">Expires in</p>
                  <p className="text-2xl font-mono font-bold text-amber-400">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </p>
                </div>
              )}

              {secondsLeft === 0 && (
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm text-red-400 font-medium">Expired</span>
                </div>
              )}
            </div>

            {/* Guardian instruction */}
            <div className="mt-4 flex items-center gap-3 bg-slate-900/60 rounded-lg px-4 py-3 border border-slate-800">
              <Smartphone size={16} className="text-amber-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                Open <span className="text-white font-medium">Auth0 Guardian</span> on your phone and tap{' '}
                <span className="text-emerald-400 font-medium">Allow</span> to approve, or{' '}
                <span className="text-red-400 font-medium">Deny</span> to reject.
              </p>
            </div>

            {/* Resend button */}
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                loading={resending}
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <RefreshCw size={14} />
                Resend notification
              </Button>
              {resent && (
                <span className="text-xs text-emerald-400">Notification resent!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
