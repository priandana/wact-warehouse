// components/shared/EmptyState.tsx
// Modern empty state with soft background icon container and actionable buttons

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
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl bg-white border border-dashed border-slate-200/80', className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-3.5 shadow-sm">
          <Icon className="w-7 h-7 text-blue-600" />
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
