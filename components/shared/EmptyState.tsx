import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl bg-white border border-slate-200/70 shadow-2xs transition-all',
        compact ? 'py-4 px-3' : 'py-5 px-4',
        className
      )}
    >
      {Icon && (
        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center mb-1.5 shadow-2xs text-slate-400">
          <Icon className="w-4 h-4 stroke-[2]" />
        </div>
      )}
      <h3 className="text-xs font-bold text-slate-800 mb-0.5 max-w-xs">{title}</h3>
      {description && (
        <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}
