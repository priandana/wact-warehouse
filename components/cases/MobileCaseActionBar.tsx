'use client';
// components/cases/MobileCaseActionBar.tsx
//
// ARCHITECTURE: Rendered FROM WITHIN CaseWorkflowActionPanel — never standalone.
//
// All authorization flags (canAssign, canRequestVerification, canVerify, canReopen)
// are computed ONCE by CaseWorkflowActionPanel using its existing role-string booleans
// and passed down here. This component:
//   - contains ZERO duplicate capability logic
//   - contains ZERO Supabase RPC calls
//   - contains ZERO independent modal state
//   - contains ZERO workflow state
//
// Handlers are direct references to CaseWorkflowActionPanel's existing functions:
//   onAssign                → setActiveModal('assign')
//   onRequestVerification   → handleRequestVerification() (inline RPC, no modal)
//   onVerify                → setActiveModal('verify')
//   onReopen                → setActiveModal('reopen')
//
// Desktop: sm:hidden — this bar NEVER renders on lg+ viewport.
// Mobile stacking: z-50 (above BottomNav z-40, below modals z-[60] and MobileNavDrawer z-[70])
// Bottom: calc(68px + safe-area-inset-bottom) — above BottomNav actual rendered height.

import { Loader2, UserPlus, Clock, CheckCircle2, RotateCw } from 'lucide-react';

export interface MobileCaseActionBarProps {
  /** Current case status from DB — passed unchanged from CaseWorkflowActionPanel */
  status: string;

  // ── Authorization flags ──────────────────────────────────────────────────
  // Computed by CaseWorkflowActionPanel. Never recomputed here.
  canAssign: boolean;
  canRequestVerification: boolean;
  canVerify: boolean;
  canReopen: boolean;

  // ── Shared mutation loading state ────────────────────────────────────────
  // Same `loading` state owned by CaseWorkflowActionPanel.
  loading: boolean;

  // ── Handler callbacks ────────────────────────────────────────────────────
  // Direct references to CaseWorkflowActionPanel's existing handlers.
  onAssign: () => void;
  onRequestVerification: () => void;
  onVerify: () => void;
  onReopen: () => void;
}

interface CtaConfig {
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
  className: string;
}

export function MobileCaseActionBar({
  status,
  canAssign,
  canRequestVerification,
  canVerify,
  canReopen,
  loading,
  onAssign,
  onRequestVerification,
  onVerify,
  onReopen,
}: MobileCaseActionBarProps) {

  // Approved primary CTA matrix — priority matches CaseWorkflowActionPanel render order.
  let cta: CtaConfig | null = null;

  if ((status === 'open' || status === 'reopened') && canAssign) {
    cta = {
      label: 'Tugaskan PIC',
      Icon: UserPlus,
      onClick: onAssign,
      className: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20',
    };
  } else if ((status === 'on_progress' || status === 'waiting_repair') && canRequestVerification) {
    cta = {
      label: 'Ajukan Verifikasi QC',
      Icon: Clock,
      onClick: onRequestVerification,
      className: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20',
    };
  } else if (status === 'waiting_verification' && canVerify) {
    cta = {
      label: 'Verifikasi Kasus',
      Icon: CheckCircle2,
      onClick: onVerify,
      className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20',
    };
  } else if (status === 'closed' && canReopen) {
    cta = {
      label: 'Buka Kembali',
      Icon: RotateCw,
      onClick: onReopen,
      className: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20',
    };
  }

  // No primary action for this role/state — bar hidden entirely.
  if (!cta) return null;

  const { label, Icon, onClick, className } = cta;

  return (
    // sm:hidden — desktop NEVER renders this. Two-column desktop layout is unchanged.
    // z-50 — above BottomNav (z-40), below modals (z-[60]) and MobileNavDrawer (z-[70])
    // bottom: above BottomNav (68px inner div height + env(safe-area-inset-bottom) padding)
    <div
      className="sm:hidden fixed left-0 right-0 z-50 px-3"
      style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Aksi kasus cepat"
    >
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg shadow-slate-900/8 px-2.5 py-2">
        <button
          type="button"
          disabled={loading}
          onClick={onClick}
          className={`w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-extrabold text-sm active:scale-[0.98] disabled:opacity-60 transition-all duration-150 ${className}`}
          aria-live="polite"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icon className="w-4 h-4 stroke-[2.5]" />
          )}
          <span>{loading ? 'Memproses...' : label}</span>
        </button>
      </div>
    </div>
  );
}
