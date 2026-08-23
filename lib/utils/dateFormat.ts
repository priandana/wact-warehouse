// lib/utils/dateFormat.ts
// Date formatting utilities respecting warehouse timezone.

import { format, formatDistance, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Formats a date for display in mobile case list (smart relative format).
 * - Today: "10:23" (time only)
 * - Yesterday: "Kemarin, 10:23"
 * - This week: "Senin, 10:23"
 * - Older: "22 Aug, 10:23"
 */
export function formatCaseDate(date: Date | string, timezone = 'Asia/Jakarta'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localDateStr = formatInTimeZone(d, timezone, 'yyyy-MM-dd HH:mm');
  const localDate = new Date(localDateStr.replace(' ', 'T') + ':00');

  if (isToday(localDate)) {
    return formatInTimeZone(d, timezone, 'HH:mm');
  }
  if (isYesterday(localDate)) {
    return `Kemarin, ${formatInTimeZone(d, timezone, 'HH:mm')}`;
  }
  return formatInTimeZone(d, timezone, 'd MMM, HH:mm');
}

/**
 * Full date-time display. Example: "22 Agustus 2026, 10:23"
 */
export function formatFullDateTime(date: Date | string, timezone = 'Asia/Jakarta'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, timezone, "d MMMM yyyy, HH:mm");
}

/**
 * Relative time. Example: "5 menit yang lalu"
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: id });
}

/**
 * SLA due date — shows urgency.
 * Returns: { text: string, isOverdue: boolean, isUrgent: boolean }
 */
export function formatDueDate(dueDate: Date | string, timezone = 'Asia/Jakarta') {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const msLeft = d.getTime() - now.getTime();
  const hoursLeft = msLeft / (1000 * 60 * 60);

  const isOverdue = msLeft < 0;
  const isUrgent = !isOverdue && hoursLeft <= 2;

  let text: string;
  if (isOverdue) {
    text = `Terlambat ${formatDistance(d, now, { locale: id })}`;
  } else if (hoursLeft < 1) {
    const minsLeft = Math.round(msLeft / (1000 * 60));
    text = `${minsLeft} menit lagi`;
  } else if (hoursLeft < 24) {
    text = `${Math.floor(hoursLeft)} jam lagi`;
  } else {
    text = formatInTimeZone(d, timezone, 'd MMM HH:mm');
  }

  return { text, isOverdue, isUrgent };
}
