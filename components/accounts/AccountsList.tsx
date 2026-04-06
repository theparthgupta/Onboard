'use client';

import { useEffect, useState } from 'react';
import { GitBranch, MessageSquare, Mail, Calendar, CheckCircle, AlertCircle, Loader2, Key, ShieldCheck } from 'lucide-react';

const CONNECTIONS = [
  { key: 'github',          label: 'GitHub',          description: 'Invite developers to your organization and grant repo access', icon: GitBranch,    scopes: 'read:user, repo, admin:org' },
  { key: 'slack',           label: 'Slack',            description: 'Send workspace invites and add new hires to channels',         icon: MessageSquare, scopes: 'chat:write, users:read, channels:read' },
  { key: 'google-gmail',    label: 'Gmail',            description: 'Send AI-personalised welcome emails to new hires',             icon: Mail,          scopes: 'gmail.send' },
  { key: 'google-calendar', label: 'Google Calendar',  description: 'Schedule AI-planned onboarding meetings for the first week',   icon: Calendar,      scopes: 'calendar.events' },
];

type ServiceStatus = { connected: boolean; source: 'token-vault' | 'fallback' | 'none' };

export function AccountsList() {
  const [status, setStatus] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/accounts/status')
      .then(r => r.json())
      .then(data => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-2">
      {CONNECTIONS.map(({ key, label, description, icon: Icon, scopes }) => {
        const svc = status[key];
        const isConnected = svc?.connected ?? false;
        const source = svc?.source ?? 'none';

        return (
          <div
            key={key}
            className={`bg-[#111] border rounded-xl p-4 flex items-center gap-4 transition-all duration-200 ${isConnected ? 'border-[#1e1e1e]' : 'border-[#161616]'}`}
          >
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${isConnected ? 'border-[#222] bg-[#1a1a1a]' : 'border-[#1a1a1a] bg-[#111]'}`}>
              <Icon size={15} className={isConnected ? 'text-[#666]' : 'text-[#2a2a2a]'} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-medium text-[#e0e0e0]">{label}</p>
                {loading ? (
                  <Loader2 size={11} className="text-[#333] animate-spin" />
                ) : isConnected ? (
                  <>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                      <CheckCircle size={10} /> Connected
                    </span>
                    {source === 'token-vault' && (
                      <span className="flex items-center gap-1 text-[10px] text-[#666] bg-[#1a1a1a] border border-[#222] px-1.5 py-0.5 rounded-md">
                        <ShieldCheck size={9} /> Auth0 Token Vault
                      </span>
                    )}
                    {source === 'fallback' && (
                      <span className="flex items-center gap-1 text-[10px] text-[#555] bg-[#1a1a1a] border border-[#1e1e1e] px-1.5 py-0.5 rounded-md">
                        <Key size={9} /> Credential configured
                      </span>
                    )}
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#444]">
                    <AlertCircle size={10} /> Not configured
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#444]">{description}</p>
              <p className="text-[10px] text-[#2a2a2a] mt-0.5 font-mono">{scopes}</p>
            </div>

            <div className="flex-shrink-0">
              {!loading && (
                <span className={`text-[11px] font-medium ${isConnected ? 'text-emerald-600' : 'text-[#333]'}`}>
                  {isConnected ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div className="mt-4 bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={14} className="text-[#444] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-[#666] mb-1">Auth0 Token Vault</p>
            <p className="text-[11px] text-[#444] leading-relaxed">
              When Token Vault is active, agents receive short-lived scoped tokens issued directly by Auth0.
              Accounts marked <span className="text-[#666]">Credential configured</span> use securely stored OAuth tokens as a fallback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
