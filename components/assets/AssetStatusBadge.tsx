import { cn } from '@/lib/utils/cn';
import {
  CheckCircle2,
  AlertCircle,
  Wrench,
  Archive,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

interface AssetStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function AssetStatusBadge({ status, size = 'md' }: AssetStatusBadgeProps) {
  const statusLower = status?.toLowerCase() || 'active';

  const config: Record<string, { label: string; icon: any; className: string }> = {
    active: {
      label: 'Aktif (Ready)',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    },
    maintenance: {
      label: 'Dalam Maintenance',
      icon: Wrench,
      className: 'bg-amber-50 text-amber-700 border-amber-200/80',
    },
    inactive: {
      label: 'Non-Aktif / Idle',
      icon: AlertCircle,
      className: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    retired: {
      label: 'Afkir (Retired)',
      icon: Archive,
      className: 'bg-rose-50 text-rose-700 border-rose-200/80',
    },
  };

  const current = config[statusLower] || config.active;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-xs',
        current.className
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span>{current.label}</span>
    </span>
  );
}

interface AssetConditionBadgeProps {
  condition?: string | null;
  size?: 'sm' | 'md';
}

export function AssetConditionBadge({ condition, size = 'sm' }: AssetConditionBadgeProps) {
  const condLower = condition?.toLowerCase() || 'good';

  const config: Record<string, { label: string; icon: any; className: string }> = {
    good: {
      label: 'Kondisi Baik',
      icon: Sparkles,
      className: 'bg-emerald-50/70 text-emerald-800 border-emerald-200/60',
    },
    fair: {
      label: 'Kondisi Cukup',
      icon: AlertCircle,
      className: 'bg-blue-50/70 text-blue-800 border-blue-200/60',
    },
    damaged: {
      label: 'Ada Kerusakan',
      icon: AlertTriangle,
      className: 'bg-amber-50/70 text-amber-800 border-amber-200/60',
    },
    critical: {
      label: 'Kritis / Rusak Berat',
      icon: ShieldAlert,
      className: 'bg-rose-50/70 text-rose-800 border-rose-200/60',
    },
  };

  const current = config[condLower] || config.good;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-xs',
        current.className
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span>{current.label}</span>
    </span>
  );
}
