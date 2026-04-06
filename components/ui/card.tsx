import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-[#111] border border-[#1e1e1e] rounded-xl p-6', className)}>
      {children}
    </div>
  );
}
