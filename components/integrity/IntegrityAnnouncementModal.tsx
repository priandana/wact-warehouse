// components/integrity/IntegrityAnnouncementModal.tsx
// Premium Auto-Open Public Announcement Modal for /integrity/report
// Features: session-based single auto-open per version, Light/Dark styling, focus trap, and privacy reassurance.

'use client';

import { useEffect, useRef } from 'react';
import {
  Info,
  AlertTriangle,
  AlertCircle,
  X,
  ShieldCheck,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PublicAnnouncementDisplay, IntegrityAnnouncementType } from '@/lib/integrity/types';

interface IntegrityAnnouncementModalProps {
  announcement: PublicAnnouncementDisplay | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTrustModal?: () => void;
}

const TYPE_CONFIG: Record<
  IntegrityAnnouncementType,
  {
    icon: typeof Info;
    headerBg: string;
    iconBg: string;
    iconColor: string;
    badgeLabel: string;
    badgeClass: string;
    accentBorder: string;
  }
> = {
  info: {
    icon: Info,
    headerBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeLabel: 'Informasi Resmi',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700/60',
    accentBorder: 'border-blue-500/30',
  },
  important: {
    icon: AlertCircle,
    headerBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeLabel: 'Pemberitahuan Penting',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/60',
    accentBorder: 'border-amber-500/30',
  },
  warning: {
    icon: AlertTriangle,
    headerBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badgeLabel: 'Peringatan Integritas',
    badgeClass: 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700/60',
    accentBorder: 'border-rose-500/30',
  },
};

export function IntegrityAnnouncementModal({
  announcement,
  isOpen,
  onClose,
  onOpenTrustModal,
}: IntegrityAnnouncementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Focus primary button when modal opens
    const timer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !announcement) return null;

  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const IconComp = typeConfig.icon;

  const handleTrustModalClick = () => {
    onClose();
    if (onOpenTrustModal) {
      setTimeout(() => {
        onOpenTrustModal();
      }, 100);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-lg bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[90vh] transition-all animate-in zoom-in-95 duration-200',
          'border-slate-200/90 dark:border-slate-800'
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs',
                typeConfig.iconBg
              )}
            >
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <span
                className={cn(
                  'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border inline-block mb-0.5',
                  typeConfig.badgeClass
                )}
              >
                {typeConfig.badgeLabel}
              </span>
              <h2 className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Pengumuman Saluran Integritas
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Pengumuman"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Announcement Title */}
          <h3
            id="announcement-modal-title"
            className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white"
          >
            {announcement.title}
          </h3>

          {/* Announcement Body */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {announcement.body}
          </div>

          {/* Privacy Reassurance Badge */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed text-emerald-950 dark:text-emerald-200 font-medium">
              Identitas Anda tidak dicatat oleh sistem WACT dan tidak ditampilkan kepada investigator.
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-2.5 shrink-0">
          {/* Primary CTA */}
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={onClose}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
          >
            <span>Saya Mengerti, Lanjut Melapor</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary Action */}
          <button
            type="button"
            onClick={handleTrustModalClick}
            className="w-full py-2 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Lihat bagaimana anonimitas bekerja</span>
          </button>
        </div>
      </div>
    </div>
  );
}
