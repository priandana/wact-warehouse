'use client';
// components/shared/layout/BottomNav.tsx
// Mobile bottom navigation bar — 5 tabs: Home · Assets · + (Create) · Cases · Profile

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  Plus,
  FileText,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Home,     label: 'Home' },
  { href: '/assets',    icon: Package,  label: 'Assets' },
  { href: '/cases/new', icon: Plus,     label: 'Buat',   isCreate: true },
  { href: '/cases',     icon: FileText, label: 'Cases' },
  { href: '/profile',   icon: User,     label: 'Profil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

          if (item.isCreate) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center"
                aria-label="Buat case baru"
              >
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[--color-primary] shadow-md shadow-blue-200 -mt-4">
                  <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-[10px] mt-1 text-[--color-text-secondary]">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 touch-target',
                'transition-colors',
                isActive
                  ? 'text-[--color-primary]'
                  : 'text-[--color-text-secondary] hover:text-[--color-text-primary]',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon
                className={cn('w-5 h-5', isActive && 'fill-current opacity-20')}
                style={isActive ? { fill: 'var(--color-primary)', stroke: 'var(--color-primary)' } : {}}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
