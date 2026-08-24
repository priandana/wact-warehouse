// components/shared/StatusBadge.tsx
// Displays case status as a modern pill badge with visual dot indicator

import { cn } from '@/lib/utils/cn';

export type CaseStatus =
  | 'open'
  | 'on_progress'
  | 'waiting_repair'
  | 'waiting_verification'
  | 'closed'
  | 'reopened';

const config: Record<CaseStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  open: {
    label: 'Open',
    bg: 'bg-blue-50/90',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200/70',
  },
  on_progress: {
    label: 'On Progress',
    bg: 'bg-purple-50/90',
    text: 'text-purple-700',
    dot: 'bg-purple-500 animate-pulse',
    border: 'border-purple-200/70',
  },
  waiting_repair: {
    label: 'Menunggu Perbaikan',
    bg: 'bg-amber-50/90',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-200/70',
  },
  waiting_verification: {
    label: 'Verifikasi QC',
    bg: 'bg-orange-50/90',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
    border: 'border-orange-200/70',
  },
  closed: {
    label: 'Selesai (Closed)',
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200/70',
  },
  reopened: {
    label: 'Reopened',
    bg: 'bg-rose-50/90',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    border: 'border-rose-200/70',
  },
};

interface StatusBadgeProps {
  status: CaseStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const conf = config[status as CaseStatus] ?? {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold tracking-tight rounded-full border shadow-2xs select-none',
        conf.bg,
        conf.text,
        conf.border,
        size === 'sm' && 'text-[10px] px-2 py-0.5',
        size === 'md' && 'text-xs px-2.5 py-1',
        size === 'lg' && 'text-sm px-3.5 py-1.5',
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', conf.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      )}
      <span>{conf.label}</span>
    </span>
  );
}
