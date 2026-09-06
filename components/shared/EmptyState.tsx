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
        'flex flex-col items-center justify-center text-center rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-white/80 dark:border-white/5 shadow-[4px_4px_14px_rgba(163,177,198,0.25),-4px_-4px_14px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_14px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02)] transition-all',
        compact ? 'py-5 px-4' : 'py-7 px-6',
        className
      )}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-2xl bg-[#EEF2F7] dark:bg-[#18233D] border border-white/80 dark:border-white/5 flex items-center justify-center mb-2.5 shadow-[inset_2px_2px_4px_rgba(163,177,198,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.02)] text-slate-500 dark:text-slate-400">
          <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
        </div>
      )}
      <h3 className="text-xs font-black text-slate-900 dark:text-white mb-1 max-w-xs">{title}</h3>
      {description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
