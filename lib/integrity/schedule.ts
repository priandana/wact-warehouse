// lib/integrity/schedule.ts
// Pure utility for null-safe announcement scheduling and timestamp normalization.

/**
 * Normalizes an optional date input (supporting null, undefined, empty string, whitespace).
 * Returns ISO string if valid, null if empty/blank, or an error string if invalid.
 */
export function normalizeOptionalIsoDate(
  val?: string | null,
  fieldName: string = 'Tanggal'
): { value: string | null; error?: string } {
  if (val === undefined || val === null) {
    return { value: null };
  }
  if (typeof val !== 'string') {
    return { value: null };
  }
  const trimmed = val.trim();
  if (trimmed === '') {
    return { value: null };
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    return { value: null, error: `${fieldName} yang dimasukkan tidak valid.` };
  }
  return { value: d.toISOString() };
}

/**
 * Validates and normalizes announcement start and end schedules.
 * Enforces chronological order: publish_end >= publish_start when both are present.
 */
export function validateAndNormalizeSchedule(
  publishStart?: string | null,
  publishEnd?: string | null
): { success: boolean; publish_start?: string | null; publish_end?: string | null; error?: string } {
  const startNorm = normalizeOptionalIsoDate(publishStart, 'Waktu mulai publikasi');
  if (startNorm.error) {
    return { success: false, error: startNorm.error };
  }

  const endNorm = normalizeOptionalIsoDate(publishEnd, 'Waktu selesai publikasi');
  if (endNorm.error) {
    return { success: false, error: endNorm.error };
  }

  if (startNorm.value && endNorm.value) {
    const startTime = new Date(startNorm.value).getTime();
    const endTime = new Date(endNorm.value).getTime();
    if (endTime < startTime) {
      return {
        success: false,
        error: 'Waktu selesai publikasi tidak boleh lebih awal dari waktu mulai.',
      };
    }
  }

  return {
    success: true,
    publish_start: startNorm.value,
    publish_end: endNorm.value,
  };
}

/**
 * Evaluates whether an announcement satisfies the canonical active schedule predicate:
 * is_active = true
 * AND (publish_start IS NULL OR publish_start <= now())
 * AND (publish_end IS NULL OR publish_end >= now())
 *
 * Supports all 4 scheduling combinations:
 * 1. no start + no end (publish_start = null, publish_end = null)
 * 2. start only (publish_start <= now, publish_end = null)
 * 3. end only (publish_start = null, publish_end >= now)
 * 4. both start and end (publish_start <= now, publish_end >= now)
 */
export function isAnnouncementActive(
  announcement: {
    is_active: boolean;
    publish_start?: string | null;
    publish_end?: string | null;
  },
  referenceDate: Date = new Date()
): boolean {
  if (!announcement.is_active) return false;
  const nowTime = referenceDate.getTime();

  if (announcement.publish_start) {
    const startTime = new Date(announcement.publish_start).getTime();
    if (isNaN(startTime) || startTime > nowTime) return false;
  }

  if (announcement.publish_end) {
    const endTime = new Date(announcement.publish_end).getTime();
    if (isNaN(endTime) || endTime < nowTime) return false;
  }

  return true;
}
