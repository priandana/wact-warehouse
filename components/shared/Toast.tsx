'use client';
// components/shared/Toast.tsx
// Enterprise-Grade Toast Notification System for WACT
// Layered at z-[80] with restrained motion, responsive safe-area placement, and auto-dismiss.

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error' | 'warehouse';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounterRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ title, description, variant = 'success', duration = 3500 }: Omit<ToastItem, 'id'>) => {
    idCounterRef.current += 1;
    const id = `toast-${idCounterRef.current}-${Date.now()}`;
    
    setToasts((prev) => {
      // Keep max 3 toasts to prevent viewport clutter
      const next = [...prev, { id, title, description, variant, duration }];
      return next.slice(-3);
    });

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Layer at z-[80] with iOS safe area support */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2.5 w-full max-w-sm sm:max-w-md px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 180);
  };

  const getVariantStyles = () => {
    switch (item.variant) {
      case 'warehouse':
        return {
          icon: Building2,
          iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
          border: 'border-blue-200/80 dark:border-blue-800/60',
          indicator: 'bg-blue-600',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-200/80 dark:border-emerald-800/60',
          indicator: 'bg-emerald-500',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
          border: 'border-amber-200/80 dark:border-amber-800/60',
          indicator: 'bg-amber-500',
        };
      case 'error':
        return {
          icon: XCircle,
          iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
          border: 'border-rose-200/80 dark:border-rose-800/60',
          indicator: 'bg-rose-500',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
          border: 'border-slate-200/90 dark:border-slate-800',
          indicator: 'bg-blue-600',
        };
    }
  };

  const { icon: IconComp, iconBg, border } = getVariantStyles();

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto w-full rounded-2xl bg-white dark:bg-slate-900 border shadow-lg dark:shadow-2xl shadow-slate-900/10 p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all duration-200 backdrop-blur-md',
        border,
        isExiting
          ? 'opacity-0 -translate-y-2 scale-95 duration-180'
          : 'animate-in fade-in slide-in-from-top-2 duration-200 ease-out'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', iconBg)}>
          <IconComp className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
            {item.title}
          </h4>
          {item.description && (
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-0.5 truncate">
              {item.description}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="p-1.5 -mr-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
