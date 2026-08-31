// components/users/RoleBadge.tsx
// Restrained role identity chips (distinct from workflow status badges).

import React from 'react';
import { Shield, ShieldAlert, Wrench, CheckCircle2, User, UserCheck } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/rolePresentation';

interface RoleBadgeProps {
  roleName: string;
  displayName?: string;
  size?: 'sm' | 'md';
}

export const ROLE_CONFIGS: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  superadmin: {
    label: 'Super Admin',
    bg: 'bg-indigo-50/80',
    text: 'text-indigo-800',
    border: 'border-indigo-200/80',
    icon: ShieldAlert,
  },
  super_admin: {
    label: 'Super Admin',
    bg: 'bg-indigo-50/80',
    text: 'text-indigo-800',
    border: 'border-indigo-200/80',
    icon: ShieldAlert,
  },
  admin: {
    label: 'Administrator',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: ShieldAlert,
  },
  regional_manager: {
    label: 'Regional Manager',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300/80',
    icon: Shield,
  },
  coordinator: {
    label: 'Koordinator',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200',
    icon: UserCheck,
  },
  qc_leader: {
    label: 'QC Leader',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: CheckCircle2,
  },
  pic_maintenance: {
    label: 'PIC Maintenance',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Wrench,
  },
  reporter: {
    label: 'Reporter',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200/70',
    icon: User,
  },
};

export function RoleBadge({ roleName, displayName, size = 'sm' }: RoleBadgeProps) {
  const normKey = (roleName || '').trim().toLowerCase();
  const config = ROLE_CONFIGS[normKey] || {
    label: getRoleDisplayName(roleName, displayName),
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: User,
  };

  const Icon = config.icon;
  const isSm = size === 'sm';
  const labelText = getRoleDisplayName(roleName, displayName);

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border ${config.bg} ${config.text} ${config.border} ${
        isSm ? 'text-[10.5px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{labelText}</span>
    </span>
  );
}
