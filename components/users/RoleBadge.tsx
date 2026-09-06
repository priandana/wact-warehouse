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
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/20 dark:border-indigo-500/30',
    icon: ShieldAlert,
  },
  super_admin: {
    label: 'Super Admin',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/20 dark:border-indigo-500/30',
    icon: ShieldAlert,
  },
  admin: {
    label: 'Administrator',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    icon: ShieldAlert,
  },
  regional_manager: {
    label: 'Regional Manager',
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-500/20 dark:border-slate-500/30',
    icon: Shield,
  },
  coordinator: {
    label: 'Koordinator',
    bg: 'bg-sky-500/10 dark:bg-sky-500/20',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/20 dark:border-sky-500/30',
    icon: UserCheck,
  },
  qc_leader: {
    label: 'QC Leader',
    bg: 'bg-teal-500/10 dark:bg-teal-500/20',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/20 dark:border-teal-500/30',
    icon: CheckCircle2,
  },
  pic_maintenance: {
    label: 'PIC Maintenance',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    icon: Wrench,
  },
  reporter: {
    label: 'Reporter',
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/20 dark:border-slate-500/30',
    icon: User,
  },
};

export function RoleBadge({ roleName, displayName, size = 'sm' }: RoleBadgeProps) {
  const normKey = (roleName || '').trim().toLowerCase();
  const config = ROLE_CONFIGS[normKey] || {
    label: getRoleDisplayName(roleName, displayName),
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/20 dark:border-slate-500/30',
    icon: User,
  };

  const Icon = config.icon;
  const isSm = size === 'sm';
  const labelText = getRoleDisplayName(roleName, displayName);

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-xl border shadow-2xs ${config.bg} ${config.text} ${config.border} ${
        isSm ? 'text-[10.5px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{labelText}</span>
    </span>
  );
}
