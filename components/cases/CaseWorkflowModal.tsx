'use client';
// components/cases/CaseWorkflowModal.tsx
// High-Reliability Enterprise Case Workflow Modal
// Rendered strictly via React Portal to document.body (z-[60])
// Features GPU-accelerated restrained motion, scroll-lock safety, focus trapping & restoration, and mutation guards.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CaseWorkflowModalProps {
  isOpen: boolean;
  /** User-requested close handler (Batal, X, backdrop, Escape). Never called during mutation completion. */
  onRequestClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  loading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  id?: string;
  className?: string;
  bodyClassName?: string;
}

export function CaseWorkflowModal({
  isOpen,
  onRequestClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  loading = false,
  maxWidth = 'md',
  children,
  footer,
  id,
  className,
  bodyClassName,
}: CaseWorkflowModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const modalId = id || `workflow-modal-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const titleId = `${modalId}-title`;
  const descId = subtitle ? `${modalId}-desc` : undefined;

  // 1. Client-only mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Open / Close lifecycle coordination with exit animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      // Capture the trigger element that had focus when modal opened
      if (typeof document !== 'undefined') {
        triggerRef.current = document.activeElement as HTMLElement | null;
      }
    } else if (shouldRender) {
      // Begin exit animation before unmounting
      setIsClosing(true);
      const isReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isReducedMotion) {
        setShouldRender(false);
        setIsClosing(false);
      } else {
        const timer = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
        }, 170); // Matches exit keyframes duration (170ms)
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, shouldRender]);

  // 3. Body scroll lock — safely captures and restores original overflow to avoid race conditions
  useEffect(() => {
    if (!shouldRender) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender]);

  // 4. Focus trapping & keyboard interactions (Escape & Tab/Shift+Tab)
  useEffect(() => {
    if (!shouldRender || isClosing) return;

    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    // Focus first interactive element or dialog itself after open
    const focusTimer = setTimeout(() => {
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        // Prioritize inputs/selects or fallback to first focusable
        const inputEl = Array.from(focusables).find((el) =>
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
        );
        if (inputEl) {
          inputEl.focus();
        } else {
          focusables[0].focus();
        }
      } else {
        dialogEl.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key dismissal — guarded when mutation is loading
      if (e.key === 'Escape') {
        if (!loading) {
          e.preventDefault();
          onRequestClose();
        }
        return;
      }

      // Tab key focus trap
      if (e.key === 'Tab') {
        const focusables = dialogEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusables.length === 0) {
          e.preventDefault();
          dialogEl.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === dialogEl) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender, isClosing, loading, onRequestClose]);

  // 5. Restore focus to trigger element when modal completely unmounts
  useEffect(() => {
    if (!shouldRender && triggerRef.current) {
      try {
        triggerRef.current.focus();
      } catch {
        // Ignore if element is no longer in DOM
      }
    }
  }, [shouldRender]);

  // Guarded backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (loading || isClosing) return;
      if (e.target === e.currentTarget) {
        onRequestClose();
      }
    },
    [loading, isClosing, onRequestClose]
  );

  if (!mounted || !shouldRender) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y',
        isClosing && 'pointer-events-none'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      id={modalId}
    >
      {/* ── 1. Single Root Backdrop Layer ──────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]',
          isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* ── 2. Modal Dialog Container ──────────────────────────────────── */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[min(calc(100dvh-2rem),640px)] sm:max-h-[85vh] overflow-hidden focus:outline-none',
          maxWidthClasses,
          isClosing ? 'animate-modal-dialog-out' : 'animate-modal-dialog',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Dialog Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0">
                <Icon className={cn('w-4 h-4', iconColor)} />
              </div>
            )}
            <div className="min-w-0">
              <h3 id={titleId} className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug truncate">
                {title}
              </h3>
              {subtitle && (
                <p id={descId} className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target flex items-center justify-center shrink-0 ml-2"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Dialog Body ───────────────────────────────────── */}
        <div className={cn('p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y', bodyClassName)}>
          {children}
        </div>

        {/* ── Sticky Dialog Footer (if provided) ───────────────────────── */}
        {footer && (
          <div
            className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
            style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
