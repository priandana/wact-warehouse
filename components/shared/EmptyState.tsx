// components/shared/EmptyState.tsx

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
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-[--color-text-disabled]" />
        </div>
      )}
      <p className="text-sm font-semibold text-[--color-text-primary] mb-1">{title}</p>
      {description && <p className="text-sm text-[--color-text-secondary] max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
