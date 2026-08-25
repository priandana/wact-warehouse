// lib/utils/sla.ts
// Centralized SLA Presentation & Classification Helper for WACT Warehouse V2

export type SlaStatusType =
  | 'no_sla'
  | 'on_time'
  | 'approaching'
  | 'overdue'
  | 'closed_on_time'
  | 'closed_late'
  | 'closed_unknown';

export interface SlaInfo {
  type: SlaStatusType;
  label: string;          // Full informative text e.g. "Sisa 3j 20m", "Lewat SLA 45m", "Selesai Tepat SLA", "Tanpa SLA"
  badgeLabel: string;     // Compact text for cards/badges e.g. "Sisa 3j 20m", "Lewat SLA 45m", "Selesai", "Tanpa SLA"
  statusLabel: string;    // Classification name e.g. "Dalam SLA", "Mendekati SLA", "Lewat SLA", "Selesai", "Tanpa SLA"
  diffMs: number | null;
  diffHours: number | null;
  isOverdue: boolean;
  isApproaching: boolean;
  isClosed: boolean;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor?: string;
  iconColor?: string;
}

/**
 * Format duration between two timestamps with exact minute/hour/day precision
 */
function formatDurationLabel(diffMs: number, prefix: string): string {
  const absMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const remMinutes = totalMinutes % 60;

  if (days >= 2) {
    return `${prefix} ${days} hari`;
  }
  if (days === 1) {
    return remHours > 0 ? `${prefix} 1 hari ${remHours}j` : `${prefix} 1 hari`;
  }
  if (totalHours >= 1) {
    return remMinutes > 0 ? `${prefix} ${totalHours}j ${remMinutes}m` : `${prefix} ${totalHours}j`;
  }
  return `${prefix} ${Math.max(1, totalMinutes)}m`;
}

/**
 * Canonical SLA status evaluator.
 * Evaluates exact timestamps and returns structured presentation semantics.
 */
export function getSlaStatus(
  dueDate: string | Date | null | undefined,
  status: string,
  closedAt?: string | Date | null,
  referenceNow = new Date()
): SlaInfo {
  if (!dueDate) {
    return {
      type: 'no_sla',
      label: 'Tanpa SLA',
      badgeLabel: 'Tanpa SLA',
      statusLabel: 'Tanpa SLA',
      diffMs: null,
      diffHours: null,
      isOverdue: false,
      isApproaching: false,
      isClosed: status === 'closed',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      badgeBorder: 'border-slate-200/80',
      dotColor: 'bg-slate-400',
      iconColor: 'text-slate-400',
    };
  }

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) {
    return {
      type: 'no_sla',
      label: 'Tanpa SLA',
      badgeLabel: 'Tanpa SLA',
      statusLabel: 'Tanpa SLA',
      diffMs: null,
      diffHours: null,
      isOverdue: false,
      isApproaching: false,
      isClosed: status === 'closed',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      badgeBorder: 'border-slate-200/80',
      dotColor: 'bg-slate-400',
      iconColor: 'text-slate-400',
    };
  }

  const isClosed = status === 'closed';

  // 1. Closed Cases: Historical SLA truth
  if (isClosed) {
    if (closedAt) {
      const closed = typeof closedAt === 'string' ? new Date(closedAt) : closedAt;
      if (!isNaN(closed.getTime())) {
        if (closed.getTime() > due.getTime()) {
          const lateMs = closed.getTime() - due.getTime();
          const lateDuration = formatDurationLabel(lateMs, 'Lewat');
          return {
            type: 'closed_late',
            label: `Selesai Lewat SLA (${lateDuration})`,
            badgeLabel: 'Selesai (Lewat SLA)',
            statusLabel: 'Selesai Lewat SLA',
            diffMs: -lateMs,
            diffHours: -(lateMs / (1000 * 60 * 60)),
            isOverdue: false,
            isApproaching: false,
            isClosed: true,
            badgeBg: 'bg-rose-50/90',
            badgeText: 'text-rose-700',
            badgeBorder: 'border-rose-200/80',
            dotColor: 'bg-rose-500',
            iconColor: 'text-rose-600',
          };
        }

        return {
          type: 'closed_on_time',
          label: 'Selesai Tepat SLA',
          badgeLabel: 'Selesai',
          statusLabel: 'Selesai Tepat SLA',
          diffMs: null,
          diffHours: null,
          isOverdue: false,
          isApproaching: false,
          isClosed: true,
          badgeBg: 'bg-emerald-50/90',
          badgeText: 'text-emerald-700',
          badgeBorder: 'border-emerald-200/70',
          dotColor: 'bg-emerald-500',
          iconColor: 'text-emerald-600',
        };
      }
    }

    // Defensive fallback if closed_at is missing/null on a closed case:
    // Return explicit neutral closed_unknown state with clean "Selesai" presentation
    return {
      type: 'closed_unknown',
      label: 'Selesai',
      badgeLabel: 'Selesai',
      statusLabel: 'Selesai',
      diffMs: null,
      diffHours: null,
      isOverdue: false,
      isApproaching: false,
      isClosed: true,
      badgeBg: 'bg-emerald-50/90',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-200/70',
      dotColor: 'bg-emerald-500',
      iconColor: 'text-emerald-600',
    };
  }

  // 2. Active Cases: Exact timestamp evaluation against current time
  const nowMs = referenceNow.getTime();
  const dueMs = due.getTime();
  const diffMs = dueMs - nowMs;
  const diffHours = diffMs / (1000 * 60 * 60);

  // Active — Overdue (due_date <= now)
  if (diffMs <= 0) {
    const overdueLabel = formatDurationLabel(diffMs, 'Lewat SLA');
    return {
      type: 'overdue',
      label: overdueLabel,
      badgeLabel: overdueLabel,
      statusLabel: 'Lewat SLA',
      diffMs,
      diffHours,
      isOverdue: true,
      isApproaching: false,
      isClosed: false,
      badgeBg: 'bg-rose-50/90',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200/90',
      dotColor: 'bg-rose-500',
      iconColor: 'text-rose-600',
    };
  }

  // Active — Approaching (0 < due_date - now <= 4 hours)
  if (diffMs <= 4 * 60 * 60 * 1000) {
    const approachingLabel = formatDurationLabel(diffMs, 'Sisa');
    return {
      type: 'approaching',
      label: approachingLabel,
      badgeLabel: approachingLabel,
      statusLabel: 'Mendekati SLA',
      diffMs,
      diffHours,
      isOverdue: false,
      isApproaching: true,
      isClosed: false,
      badgeBg: 'bg-amber-50/90',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200/80',
      dotColor: 'bg-amber-500',
      iconColor: 'text-amber-600',
    };
  }

  // Active — Safe / On Time (due_date - now > 4 hours)
  const safeLabel = formatDurationLabel(diffMs, 'Sisa');
  return {
    type: 'on_time',
    label: safeLabel,
    badgeLabel: safeLabel,
    statusLabel: 'Dalam SLA',
    diffMs,
    diffHours,
    isOverdue: false,
    isApproaching: false,
    isClosed: false,
    badgeBg: 'bg-slate-100/90',
    badgeText: 'text-slate-600',
    badgeBorder: 'border-slate-200/70',
    dotColor: 'bg-slate-400',
    iconColor: 'text-slate-400',
  };
}

/**
 * Returns UTC Date boundaries [start, nextDay) for the current calendar day in Asia/Jakarta (WIB = UTC+7)
 */
export function getJakartaDayBoundaries(referenceDate = new Date()): { start: Date; nextDay: Date } {
  // Asia/Jakarta is fixed UTC+7
  const wibTime = referenceDate.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(wibTime);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const date = d.getUTCDate();

  // UTC equivalent of 00:00:00.000 WIB
  const start = new Date(Date.UTC(y, m, date, -7, 0, 0, 0));
  // UTC equivalent of 00:00:00.000 WIB next day
  const nextDay = new Date(Date.UTC(y, m, date + 1, -7, 0, 0, 0));

  return { start, nextDay };
}
