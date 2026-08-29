// lib/utils/activityPresentation.ts
// Pure presentation mapping for Case Activities / Timeline audit trail.
// Strict business logic lock: Contains ZERO database, mutation, or authorization logic.

import React from 'react';
import {
  FilePlus2,
  UserCheck,
  Wrench,
  Camera,
  CheckCircle2,
  XCircle,
  RotateCw,
  Tag,
  CalendarClock,
  ShieldAlert,
  MessageSquare,
  ArrowRightLeft,
  Activity,
  Send,
} from 'lucide-react';

export interface ActivityPresentation {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  nodeBg: string;
  nodeBorder: string;
}

export interface ActivityItemInput {
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  metadata?: Record<string, any> | any[] | string | number | boolean | null;
}

export function getActivityPresentation(item: ActivityItemInput): ActivityPresentation {
  const { action, from_status, to_status } = item;
  const meta = (typeof item.metadata === 'object' && item.metadata !== null && !Array.isArray(item.metadata))
    ? (item.metadata as Record<string, any>)
    : {};

  switch (action) {
    case 'created':
      return {
        title: 'Kasus Dibuat & Dilaporkan',
        icon: FilePlus2,
        iconColor: 'text-blue-600',
        nodeBg: 'bg-blue-50',
        nodeBorder: 'border-blue-200',
      };

    case 'assigned':
      return {
        title: meta.assignee_name
          ? `Kasus Ditugaskan ke ${meta.assignee_name}`
          : 'Penugasan Penanggung Jawab (PIC)',
        subtitle: meta.reason ? `Alasan: ${meta.reason}` : undefined,
        icon: UserCheck,
        iconColor: 'text-indigo-600',
        nodeBg: 'bg-indigo-50',
        nodeBorder: 'border-indigo-200',
      };

    case 'status_changed':
      if (to_status === 'waiting_verification') {
        return {
          title: 'Verifikasi QC Diajukan',
          subtitle: meta.notes ? `Catatan: ${meta.notes}` : undefined,
          icon: Send,
          iconColor: 'text-purple-600',
          nodeBg: 'bg-purple-50',
          nodeBorder: 'border-purple-200',
        };
      }
      return {
        title: 'Perubahan Status Alur Kerja',
        icon: ArrowRightLeft,
        iconColor: 'text-blue-600',
        nodeBg: 'bg-blue-50',
        nodeBorder: 'border-blue-200',
      };

    case 'maintenance_updated':
    case 'progress_updated':
      return {
        title: 'Progres & Maintenance Diperbarui',
        subtitle: meta.root_cause_name ? `Akar Masalah: ${meta.root_cause_name}` : undefined,
        icon: Wrench,
        iconColor: 'text-amber-600',
        nodeBg: 'bg-amber-50',
        nodeBorder: 'border-amber-200',
      };

    case 'evidence_added': {
      let phaseLabel = 'Bukti foto ditambahkan';
      if (meta.phase === 'before') phaseLabel = 'Foto Awal (Before) diunggah';
      else if (meta.phase === 'during') phaseLabel = 'Foto Proses (During) diunggah';
      else if (meta.phase === 'after') phaseLabel = 'Foto Selesai (After) diunggah';

      return {
        title: phaseLabel,
        icon: Camera,
        iconColor: 'text-emerald-600',
        nodeBg: 'bg-emerald-50',
        nodeBorder: 'border-emerald-200',
      };
    }

    case 'verified':
      return {
        title: 'Pekerjaan Diverifikasi & Disetujui (QC)',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
        nodeBg: 'bg-emerald-50',
        nodeBorder: 'border-emerald-200',
      };

    case 'verification_failed':
      return {
        title: 'Verifikasi Ditolak — Perlu Perbaikan Ulang',
        icon: XCircle,
        iconColor: 'text-rose-600',
        nodeBg: 'bg-rose-50',
        nodeBorder: 'border-rose-200',
      };

    case 'reopened':
      return {
        title: 'Kasus Dibuka Kembali (Reopened)',
        icon: RotateCw,
        iconColor: 'text-indigo-600',
        nodeBg: 'bg-indigo-50',
        nodeBorder: 'border-indigo-200',
      };

    case 'priority_changed':
      return {
        title: meta.to
          ? `Prioritas Diubah menjadi ${String(meta.to).toUpperCase()}`
          : 'Prioritas Kasus Diubah',
        icon: Tag,
        iconColor: 'text-slate-600',
        nodeBg: 'bg-slate-100',
        nodeBorder: 'border-slate-200',
      };

    case 'due_date_overridden':
      return {
        title: 'Batas Waktu SLA Disesuaikan',
        icon: CalendarClock,
        iconColor: 'text-purple-600',
        nodeBg: 'bg-purple-50',
        nodeBorder: 'border-purple-200',
      };

    case 'force_closed':
      return {
        title: 'Kasus Ditutup Paksa oleh Administrator',
        icon: ShieldAlert,
        iconColor: 'text-rose-600',
        nodeBg: 'bg-rose-50',
        nodeBorder: 'border-rose-200',
      };

    case 'commented':
      return {
        title: meta.is_internal ? 'Catatan Internal Ditambahkan' : 'Komentar Ditambahkan',
        icon: MessageSquare,
        iconColor: 'text-slate-600',
        nodeBg: 'bg-slate-100',
        nodeBorder: 'border-slate-200',
      };

    case 'closed':
      return {
        title: 'Kasus Diselesaikan & Ditutup',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
        nodeBg: 'bg-emerald-50',
        nodeBorder: 'border-emerald-200',
      };

    default:
      return {
        title: action.replace(/_/g, ' '),
        icon: Activity,
        iconColor: 'text-slate-500',
        nodeBg: 'bg-slate-50',
        nodeBorder: 'border-slate-200',
      };
  }
}
