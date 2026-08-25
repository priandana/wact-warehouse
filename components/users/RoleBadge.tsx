// components/users/RoleBadge.tsx
import React from 'react';
import { Shield, ShieldAlert, Wrench, CheckCircle2, User, UserCheck } from 'lucide-react';

interface RoleBadgeProps {
  roleName: string;
  displayName?: string;
  size?: 'sm' | 'md';
}

export const ROLE_CONFIGS: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: {
    label: 'Administrator',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: ShieldAlert,
  },
  regional_manager: {
    label: 'Regional Manager',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Shield,
  },
  coordinator: {
    label: 'Coordinator / Officer',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: UserCheck,
  },
  qc_leader: {
    label: 'QC Leader',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: CheckCircle2,
  },
  pic_maintenance: {
    label: 'PIC / Maintenance',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Wrench,
  },
  reporter: {
    label: 'Reporter / Operator',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: User,
  },
};

export function RoleBadge({ roleName, displayName, size = 'sm' }: RoleBadgeProps) {
  const config = ROLE_CONFIGS[roleName] || {
    label: displayName || roleName,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: User,
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border ${config.bg} ${config.text} ${config.border} ${
        isSm ? 'text-[10.5px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{displayName || config.label}</span>
    </span>
  );
}
