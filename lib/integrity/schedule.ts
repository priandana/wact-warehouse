// lib/integrity/schedule.ts
// Pure utility for null-safe announcement scheduling verification.

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
