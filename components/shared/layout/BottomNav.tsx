'use client';
// components/shared/layout/BottomNav.tsx
// Mobile bottom navigation bar — Consumer/Fintech Grade
// 5 tabs: Home · Assets · + (Laporkan) · Cases · Profil

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
  { href: '/dashboard', icon: Home,     label: 'Beranda' },
  { href: '/assets',    icon: Package,  label: 'Aset' },
  { href: '/cases/new', icon: Plus,     label: 'Laporkan', isCreate: true },
  { href: '/cases',     icon: FileText, label: 'Kasus' },
  { href: '/profile',   icon: User,     label: 'Profil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-[68px] max-w-md mx-auto px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          if (item.isCreate) {
            return (
              <div key={item.href} className="relative flex flex-col items-center justify-center -mt-6">
                <Link
                  href={item.href}
                  className="group flex items-center justify-center w-[54px] h-[54px] rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-[0_10px_25px_-3px_rgba(37,99,235,0.45)] hover:shadow-[0_14px_30px_-3px_rgba(37,99,235,0.55)] active:scale-95 transition-all duration-200"
                  aria-label="Buat case baru"
                >
                  <Plus className="w-7 h-7 text-white stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
                </Link>
                <span className="text-[10px] font-semibold text-slate-600 mt-1">
                  {item.label}
                </span>
              </div>
            );
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (isActive && pathname === item.href) {
                  e.preventDefault();
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 tap-active touch-target transition-all active:scale-95',
                isActive
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 font-medium',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={cn(
                'p-1 rounded-xl transition-colors',
                isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400'
              )}>
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
              </div>
              <span className="text-[10.5px] leading-none tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
