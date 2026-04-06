'use client';

import { useState } from 'react';
import { AuditEntry } from '@/lib/types';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_COLORS: Record<string, string> = {
  github:     'text-[#666]',
  slack:      'text-[#666]',
  gmail:      'text-[#666]',
  calendar:   'text-[#666]',
  production: 'text-amber-600',
  system:     'text-[#444]',
};

export function AuditLog({ entries }: { entries: AuditEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, 6);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#444] uppercase tracking-widest">Audit Trail</span>
          <span className="text-xs text-[#333] bg-[#1a1a1a] border border-[#222] px-1.5 py-0.5 rounded">
            {entries.length}
          </span>
        </div>
        {entries.length > 6 && (
          <span className="text-[#333] group-hover:text-[#666] transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#111]">
          {visible.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-2 hover:bg-[#111] transition-colors duration-100 group"
            >
              <span className="flex-shrink-0 text-[#333] text-[10px] font-mono w-16 pt-px tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
              <span className={cn(
                'flex-shrink-0 w-14 text-[9px] font-mono uppercase tracking-wider pt-px font-bold',
                PLATFORM_COLORS[entry.platform] ?? 'text-[#444]'
              )}>
                {entry.platform}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-[#666] group-hover:text-[#888] transition-colors">{entry.action}</span>
                {entry.details && entry.details !== entry.action && (
                  <p className="text-[10px] text-[#333] mt-0.5 leading-relaxed line-clamp-2">{entry.details}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {entry.approved !== undefined && (
                  entry.approved
                    ? <Check size={10} className="text-emerald-600" />
                    : <X size={10} className="text-red-700" />
                )}
                {entry.tokenScope && (
                  <span className="text-[9px] text-[#2a2a2a] font-mono hidden group-hover:inline">
                    {entry.tokenScope}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {!expanded && entries.length > 6 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2 text-[10px] text-[#333] hover:text-[#555] hover:bg-[#111] transition-all duration-150 border-t border-[#111]"
          >
            Show {entries.length - 6} more entries
          </button>
        )}
      </div>
    </div>
  );
}
