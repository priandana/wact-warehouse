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
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#EEF2F7]/95 dark:bg-[#131C31]/95 backdrop-blur-xl border-t border-white/70 dark:border-slate-800/50 shadow-[0_-6px_20px_rgba(163,177,198,0.3)] dark:shadow-[0_-6px_20px_rgba(0,0,0,0.6)] select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-[70px] max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          if (item.isCreate) {
            return (
              <div key={item.href} className="relative flex flex-col items-center justify-center -mt-7">
                <Link
                  href={item.href}
                  className="group flex items-center justify-center w-[52px] h-[52px] rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white shadow-[4px_4px_14px_rgba(37,99,235,0.4),-2px_-2px_8px_rgba(255,255,255,0.7)] active:scale-95 transition-all duration-200 ring-4 ring-[#EEF2F7] dark:ring-[#131C31]"
                  aria-label="Buat case baru"
                >
                  <Plus className="w-5.5 h-5.5 text-white stroke-[2.6] group-hover:rotate-90 transition-transform duration-200" />
                </Link>
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 mt-1">
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
                'flex flex-col items-center justify-center w-14 h-13 rounded-2xl gap-1 tap-active touch-target transition-all active:scale-95',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={cn(
                'p-1.5 px-2.5 rounded-full transition-all duration-200',
                isActive
                  ? 'bg-[#EEF2F7] dark:bg-[#0D1322] text-blue-600 dark:text-blue-400 shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)] border border-blue-500/20'
                  : 'text-slate-400 dark:text-slate-500'
              )}>
                <Icon className={cn('w-4.5 h-4.5 transition-transform duration-200', isActive && 'scale-110')} />
              </div>
              <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
