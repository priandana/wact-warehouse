// components/shared/PriorityBadge.tsx
// Displays case priority with strong visual indicator

import { cn } from '@/lib/utils/cn';
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

const config: Record<Priority, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  critical: {
    label: 'Kritis',
    bg: 'bg-rose-50/90',
    text: 'text-rose-700',
    border: 'border-rose-200/70',
    icon: ShieldAlert,
  },
  high: {
    label: 'Tinggi',
    bg: 'bg-orange-50/90',
    text: 'text-orange-700',
    border: 'border-orange-200/70',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Sedang',
    bg: 'bg-blue-50/90',
    text: 'text-blue-700',
    border: 'border-blue-200/70',
    icon: Info,
  },
  low: {
    label: 'Rendah',
    bg: 'bg-slate-100/90',
    text: 'text-slate-600',
    border: 'border-slate-200/70',
    icon: AlertCircle,
  },
};

interface PriorityBadgeProps {
  priority: Priority | string;
  size?: 'sm' | 'md';
  variant?: 'pill' | 'text';
}

export function PriorityBadge({ priority, size = 'md', variant = 'pill' }: PriorityBadgeProps) {
  const conf = config[priority as Priority] ?? config.low;
  const Icon = conf.icon;

  if (variant === 'text') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-bold', conf.text, size === 'sm' ? 'text-[11px]' : 'text-xs')}>
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{conf.label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-extrabold rounded-full border select-none shadow-[1.5px_1.5px_3px_rgba(163,177,198,0.22),-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] dark:shadow-[1.5px_1.5px_3px_rgba(0,0,0,0.35),-1px_-1px_2px_rgba(255,255,255,0.02)]',
        conf.bg,
        conf.text,
        conf.border,
        size === 'sm' ? 'text-[10.5px] px-2.5 py-0.5' : 'text-xs px-3 py-1',
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{conf.label}</span>
    </span>
  );
}
