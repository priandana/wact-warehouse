// components/integrity/IntegrityAnnouncementModal.tsx
// Premium Auto-Open Public Announcement Modal for /integrity/report
// Features: Restrained enterprise motion, staggered reveal, privacy reassurance pillars, and Light/Dark polish.

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Lock,
  UserX,
  Camera,
  ArrowRight,
  Sparkles,
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
    icon: typeof Shield;
    badgeLabel: string;
    badgeClass: string;
    heroGlowClass: string;
    iconBgClass: string;
    iconColorClass: string;
    borderAccentClass: string;
  }
> = {
  info: {
    icon: Shield,
    badgeLabel: 'Informasi Resmi',
    badgeClass:
      'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
    heroGlowClass: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    iconBgClass:
      'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-200/90 dark:border-blue-800/80 shadow-blue-500/10',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    borderAccentClass: 'border-blue-500/20 dark:border-blue-500/30',
  },
  important: {
    icon: AlertCircle,
    badgeLabel: 'Pemberitahuan Penting',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    heroGlowClass: 'from-amber-500/10 via-orange-500/5 to-transparent',
    iconBgClass:
      'bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border-amber-200/90 dark:border-amber-800/80 shadow-amber-500/10',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    borderAccentClass: 'border-amber-500/20 dark:border-amber-500/30',
  },
  warning: {
    icon: ShieldAlert,
    badgeLabel: 'Peringatan Integritas',
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
    heroGlowClass: 'from-rose-500/10 via-pink-500/5 to-transparent',
    iconBgClass:
      'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200/90 dark:border-rose-800/80 shadow-rose-500/10',
    iconColorClass: 'text-rose-600 dark:text-rose-400',
    borderAccentClass: 'border-rose-500/20 dark:border-rose-500/30',
  },
};

export function IntegrityAnnouncementModal({
  announcement,
  isOpen,
  onClose,
  onOpenTrustModal,
}: IntegrityAnnouncementModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setIsClosing(false);
      previousActiveElement.current = document.activeElement as HTMLElement | null;

      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 80);

      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  const handleGracefulClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setMounted(false);
      previousActiveElement.current?.focus();
    }, 180);
  };

  // Keyboard accessibility (Escape + Focus Trap)
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleGracefulClose();
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mounted, isClosing]);

  if (!isOpen && !mounted) return null;
  if (!announcement) return null;

  const typeConfig = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const IconComp = typeConfig.icon;

  const handleTrustModalClick = () => {
    handleGracefulClose();
    if (onOpenTrustModal) {
      setTimeout(() => {
        onOpenTrustModal();
      }, 190);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      {/* ── Backdrop with restrained blur and smooth opacity ── */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-200 ease-out motion-reduce:transition-none',
          isClosing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleGracefulClose}
        aria-hidden="true"
      />

      {/* ── Modal Dialog Container with Enterprise Motion ── */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-lg bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[88vh] transition-all',
          'border-slate-200/90 dark:border-slate-800/90',
          'motion-reduce:transition-none motion-reduce:transform-none',
          isClosing
            ? 'duration-180 ease-in opacity-0 scale-[0.96] translate-y-2'
            : 'duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 scale-100 translate-y-0'
        )}
      >
        {/* Subtle Top Gradient Glow */}
        <div
          className={cn(
            'absolute top-0 inset-x-0 h-32 bg-gradient-to-b pointer-events-none opacity-80',
            typeConfig.heroGlowClass
          )}
        />

        {/* ── Top Header Section (Stagger 1) ── */}
        <div className="relative flex items-center justify-between p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200',
                typeConfig.iconBgClass
              )}
            >
              <IconComp className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border inline-block',
                    typeConfig.badgeClass
                  )}
                >
                  {typeConfig.badgeLabel}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase mt-0.5">
                Pengumuman Integritas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGracefulClose}
            aria-label="Tutup Pengumuman"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Content Area (Staggered 2, 3, 4) ── */}
        <div className="relative p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Stagger 2: Title */}
          <div className="space-y-1">
            <h3
              id="announcement-modal-title"
              className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white leading-snug"
            >
              {announcement.title}
            </h3>
          </div>

          {/* Stagger 3: Announcement Body */}
          <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {announcement.body}
          </div>

          {/* Stagger 4: Compact 3-Fact Privacy Reassurance Block */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100/90 dark:border-blue-900/40 space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Jaminan Privasi Sistem WACT</span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3 h-3" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-900 dark:text-white">Identitas Anda tidak disimpan: </span>
                  <span className="text-[11.5px] text-slate-600 dark:text-slate-400">
                    Sistem WACT tidak mencatat nama, akun, IP, atau user-agent.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <UserX className="w-3 h-3" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-900 dark:text-white">Investigator tidak melihat pelapor: </span>
                  <span className="text-[11.5px] text-slate-600 dark:text-slate-400">
                    Laporan diperiksa secara independen tanpa data pribadi pengirim.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Camera className="w-3 h-3" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-900 dark:text-white">Metadata foto dibersihkan: </span>
                  <span className="text-[11.5px] text-slate-600 dark:text-slate-400">
                    Data lokasi GPS dan EXIF kamera otomatis dibersihkan sebelum disimpan.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons Footer (Stagger 5) ── */}
        <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col gap-2.5 shrink-0">
          {/* Primary CTA Button */}
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={handleGracefulClose}
            className={cn(
              'w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-md shadow-blue-500/20',
              'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
              'hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all',
              'flex items-center justify-center gap-2 cursor-pointer min-h-[44px]',
              'motion-reduce:transition-none motion-reduce:transform-none'
            )}
          >
            <span>Saya Mengerti, Lanjut Melapor</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary Action Link */}
          <button
            type="button"
            onClick={handleTrustModalClick}
            className={cn(
              'w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors',
              'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400',
              'hover:bg-slate-100 dark:hover:bg-slate-800/60',
              'flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Lihat bagaimana anonimitas bekerja</span>
          </button>
        </div>
      </div>
    </div>
  );
}
