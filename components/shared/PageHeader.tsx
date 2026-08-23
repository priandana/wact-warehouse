// components/shared/PageHeader.tsx
// Mobile page header with back button and action slots

import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-[--color-bg]/80 backdrop-blur-md border-b border-[--color-border-light]',
        'px-4 py-3 flex items-center gap-3',
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-[--color-text-primary]" />
        </Link>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-[--color-text-primary] truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[--color-text-secondary] truncate">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
