// components/shared/EmptyState.tsx
// Compact, friendly, visually balanced empty state

import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-7 px-4 text-center rounded-2xl bg-white border border-slate-200/70 shadow-2xs', className)}>
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-2.5 shadow-2xs">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      )}
      <h3 className="text-xs font-extrabold text-slate-800 mb-0.5">{title}</h3>
      {description && <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
