import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium tracking-wide',
        (variant === 'default' || variant === 'muted') && 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]',
        variant === 'success' && 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40',
        variant === 'warning' && 'bg-amber-950/30 text-amber-400 border border-amber-900/40',
        variant === 'error' && 'bg-red-950/30 text-red-400 border border-red-900/40',
        variant === 'info' && 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]',
        className
      )}
    >
      {children}
    </span>
  );
}
