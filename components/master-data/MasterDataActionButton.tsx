'use client';

// components/master-data/MasterDataActionButton.tsx
// Shared presentation-only action button for WACT Master Data Command Center (Phase UI-11 Checkpoint 4).
// Provides consistent thumb-friendly touch geometry (44x44 mobile, 40x40 desktop), centered icon alignment,
// and accessible feedback across edit, activate, deactivate, and add/override variants.

import React from 'react';
import { Edit2, Power, Plus, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type MasterDataActionVariant = 'edit' | 'activate' | 'deactivate' | 'add';

export interface MasterDataActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: MasterDataActionVariant;
  icon?: LucideIcon;
  loading?: boolean;
  size?: 'default' | 'sm';
}

const VARIANT_CONFIG: Record<
  MasterDataActionVariant,
  { base: string; defaultIcon: LucideIcon; defaultLabel: string }
> = {
  edit: {
    base: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/90 bg-white shadow-2xs',
    defaultIcon: Edit2,
    defaultLabel: 'Edit',
  },
  activate: {
    base: 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200/80 bg-emerald-50/40 shadow-2xs',
    defaultIcon: Power,
    defaultLabel: 'Aktifkan',
  },
  deactivate: {
    base: 'text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200/80 bg-amber-50/40 shadow-2xs',
    defaultIcon: Power,
    defaultLabel: 'Nonaktifkan',
  },
  add: {
    base: 'text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200/80 bg-blue-50/40 shadow-2xs',
    defaultIcon: Plus,
    defaultLabel: 'Tambah',
  },
};

export const MasterDataActionButton = React.forwardRef<HTMLButtonElement, MasterDataActionButtonProps>(
  (
    {
      variant,
      icon: CustomIcon,
      loading = false,
      size = 'default',
      className,
      disabled,
      title,
      'aria-label': ariaLabel,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const config = VARIANT_CONFIG[variant];
    const Icon = CustomIcon || config.defaultIcon;
    const resolvedTitle = title || config.defaultLabel;
    const resolvedAriaLabel = ariaLabel || resolvedTitle;

    return (
      <button
        ref={ref}
        type={type}
        title={resolvedTitle}
        aria-label={resolvedAriaLabel}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center shrink-0 rounded-xl border font-semibold transition-all select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          'h-11 w-11 sm:h-10 sm:w-10', // Uniform 44x44px mobile touch target, 40x40px on desktop
          config.base,
          size === 'sm' && 'border-slate-200/70 shadow-none bg-white/80 hover:bg-white',
          'active:scale-95',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn('animate-spin shrink-0', size === 'default' ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
        ) : (
          <Icon className={cn('shrink-0', size === 'default' ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
        )}
        {children}
      </button>
    );
  }
);

MasterDataActionButton.displayName = 'MasterDataActionButton';
