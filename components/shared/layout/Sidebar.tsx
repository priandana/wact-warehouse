'use client';
// components/shared/layout/Sidebar.tsx
// Desktop sidebar navigation

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  FileText,
  ClipboardCheck,
  Wrench,
  BarChart2,
  Bell,
  Settings,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavGroup {
  label?: string;
  items: {
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
  }[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: Home,          label: 'Dashboard' },
      { href: '/cases',     icon: FileText,       label: 'Cases' },
      { href: '/my-tasks',  icon: ClipboardCheck, label: 'My Tasks' },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { href: '/assets',      icon: Package,  label: 'Assets' },
      { href: '/inspections', icon: ClipboardCheck, label: 'Inspeksi' },
      { href: '/maintenance', icon: Wrench,   label: 'Maintenance' },
    ],
  },
  {
    label: 'Analitik',
    items: [
      { href: '/analytics',    icon: BarChart2, label: 'Analytics' },
      { href: '/reports',      icon: FileText,  label: 'Reports' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { href: '/notifications', icon: Bell,     label: 'Notifikasi' },
      { href: '/master-data',   icon: Settings, label: 'Master Data' },
      { href: '/users',         icon: Building2, label: 'Users' },
    ],
  },
];

interface SidebarProps {
  warehouseName?: string;
  warehouseCode?: string;
  userName?: string;
}

export function Sidebar({ warehouseName, warehouseCode, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[--color-primary] flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[--color-text-primary]">WACT</span>
        </div>
        <p className="text-xs text-[--color-text-secondary] mt-1">Warehouse Action Tracker</p>
      </div>

      {/* Warehouse selector */}
      {warehouseName && (
        <button className="mx-4 my-3 px-3 py-2.5 rounded-xl bg-[--color-primary-light] flex items-center justify-between text-left hover:bg-blue-100 transition-colors">
          <div>
            <p className="text-xs text-[--color-primary] font-semibold">{warehouseCode}</p>
            <p className="text-sm font-medium text-[--color-text-primary] truncate max-w-[160px]">{warehouseName}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-[--color-primary] shrink-0" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.label && (
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[--color-text-disabled]">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5',
                    isActive
                      ? 'bg-[--color-primary-light] text-[--color-primary]'
                      : 'text-[--color-text-secondary] hover:bg-gray-50 hover:text-[--color-text-primary]',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="text-xs bg-[--color-danger] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-[--color-text-disabled]">Masuk sebagai</p>
        <p className="text-sm font-medium text-[--color-text-primary] truncate">{userName ?? '...'}</p>
      </div>
    </aside>
  );
}
