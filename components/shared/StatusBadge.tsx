// components/shared/StatusBadge.tsx
// Displays case status as a pill badge

import { cn } from '@/lib/utils/cn';

type CaseStatus =
  | 'open'
  | 'on_progress'
  | 'waiting_repair'
  | 'waiting_verification'
  | 'closed'
  | 'reopened';

const config: Record<CaseStatus, { label: string; className: string }> = {
  open:                 { label: 'Open',             className: 'bg-blue-50 text-blue-600 border-blue-100' },
  on_progress:          { label: 'On Progress',      className: 'bg-purple-50 text-purple-600 border-purple-100' },
  waiting_repair:       { label: 'Waiting Repair',   className: 'bg-amber-50 text-amber-600 border-amber-100' },
  waiting_verification: { label: 'Waiting Verify',   className: 'bg-orange-50 text-orange-600 border-orange-100' },
  closed:               { label: 'Closed',           className: 'bg-green-50 text-green-600 border-green-100' },
  reopened:             { label: 'Reopened',         className: 'bg-red-50 text-red-600 border-red-100' },
};

interface StatusBadgeProps {
  status: CaseStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { label, className } = config[status] ?? { label: status, className: 'bg-gray-50 text-gray-500 border-gray-100' };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className,
      )}
    >
      {label}
    </span>
  );
}
