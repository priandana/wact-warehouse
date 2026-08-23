// components/shared/PriorityBadge.tsx

import { cn } from '@/lib/utils/cn';

type Priority = 'low' | 'medium' | 'high' | 'critical';

const config: Record<Priority, { label: string; dot: string; text: string }> = {
  critical: { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-600' },
  high:     { label: 'High',     dot: 'bg-orange-500', text: 'text-orange-600' },
  medium:   { label: 'Medium',   dot: 'bg-blue-500',   text: 'text-blue-600' },
  low:      { label: 'Low',      dot: 'bg-gray-400',   text: 'text-gray-500' },
};

interface PriorityBadgeProps {
  priority: Priority;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, showDot = true, size = 'md' }: PriorityBadgeProps) {
  const { label, dot, text } = config[priority] ?? config.low;

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium', text, size === 'sm' ? 'text-[10px]' : 'text-xs')}>
      {showDot && <span className={cn('rounded-full shrink-0', dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />}
      {label}
    </span>
  );
}
