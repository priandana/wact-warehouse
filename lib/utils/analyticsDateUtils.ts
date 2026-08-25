// lib/utils/analyticsDateUtils.ts
// Timezone-aware date utilities for Asia/Jakarta (WIB) operational analytics

import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export const TIMEZONE = 'Asia/Jakarta';

export type PeriodKey = '7d' | '30d' | 'month' | 'all';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

/**
 * Returns current Date in WIB timezone
 */
export function getNowWib(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Returns start and end timestamps in WIB for a given period key
 */
export function getPeriodDateRange(period: PeriodKey, referenceDate = new Date()): DateRange {
  const nowWib = toZonedTime(referenceDate, TIMEZONE);

  switch (period) {
    case '7d': {
      const startDate = startOfDay(subDays(nowWib, 6));
      const endDate = endOfDay(nowWib);
      return { startDate, endDate, label: '7 Hari Terakhir' };
    }
    case '30d': {
      const startDate = startOfDay(subDays(nowWib, 29));
      const endDate = endOfDay(nowWib);
      return { startDate, endDate, label: '30 Hari Terakhir' };
    }
    case 'month': {
      const startDate = startOfMonth(nowWib);
      const endDate = endOfMonth(nowWib);
      return { startDate, endDate, label: 'Bulan Ini' };
    }
    case 'all':
    default:
      return { startDate: null, endDate: null, label: 'Semua Waktu' };
  }
}

/**
 * Checks whether an ISO date string falls within the specified period (evaluated in WIB)
 */
export function isIsoInPeriod(dateStr: string | null | undefined, period: PeriodKey, referenceDate = new Date()): boolean {
  if (!dateStr) return false;
  if (period === 'all') return true;

  const { startDate, endDate } = getPeriodDateRange(period, referenceDate);
  if (!startDate || !endDate) return true;

  try {
    const itemDateWib = toZonedTime(parseISO(dateStr), TIMEZONE);
    return isWithinInterval(itemDateWib, { start: startDate, end: endDate });
  } catch {
    return false;
  }
}

/**
 * Formats an ISO date string into WIB timezone representation
 */
export function formatWib(dateStr: string | Date | null | undefined, pattern: string): string {
  if (!dateStr) return '—';
  try {
    const dateObj = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    const zoned = toZonedTime(dateObj, TIMEZONE);
    return formatTz(zoned, pattern, { timeZone: TIMEZONE, locale: localeId });
  } catch {
    return '—';
  }
}

/**
 * Generates an array of daily formatted date strings in WIB for the trend chart
 */
export function getDailyChartBuckets(period: PeriodKey, referenceDate = new Date()): { key: string; label: string; date: Date }[] {
  const nowWib = toZonedTime(referenceDate, TIMEZONE);
  const buckets: { key: string; label: string; date: Date }[] = [];

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = subDays(nowWib, i);
      buckets.push({
        key: formatTz(d, 'yyyy-MM-dd', { timeZone: TIMEZONE }),
        label: formatTz(d, 'dd MMM', { timeZone: TIMEZONE, locale: localeId }),
        date: d,
      });
    }
  } else if (period === '30d') {
    for (let i = 29; i >= 0; i--) {
      const d = subDays(nowWib, i);
      buckets.push({
        key: formatTz(d, 'yyyy-MM-dd', { timeZone: TIMEZONE }),
        label: formatTz(d, 'dd/MM', { timeZone: TIMEZONE, locale: localeId }),
        date: d,
      });
    }
  } else if (period === 'month') {
    const start = startOfMonth(nowWib);
    const dayCount = nowWib.getDate();
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.push({
        key: formatTz(d, 'yyyy-MM-dd', { timeZone: TIMEZONE }),
        label: formatTz(d, 'dd MMM', { timeZone: TIMEZONE, locale: localeId }),
        date: d,
      });
    }
  } else {
    // 'all' -> Last 14 days by default for readable trend timeline
    for (let i = 13; i >= 0; i--) {
      const d = subDays(nowWib, i);
      buckets.push({
        key: formatTz(d, 'yyyy-MM-dd', { timeZone: TIMEZONE }),
        label: formatTz(d, 'dd MMM', { timeZone: TIMEZONE, locale: localeId }),
        date: d,
      });
    }
  }

  return buckets;
}
