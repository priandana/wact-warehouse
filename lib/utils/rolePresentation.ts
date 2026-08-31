// lib/utils/rolePresentation.ts
// Pure presentation helpers for multi-role identity and user formatting.
// Strict business logic lock: Contains ZERO authorization, mutation, or capability evaluation.

export const CANONICAL_ROLE_ORDER: Record<string, number> = {
  superadmin: 0,
  super_admin: 0,
  admin: 1,
  regional_manager: 2,
  coordinator: 3,
  integrity_investigator: 4,
  qc_leader: 5,
  pic_maintenance: 6,
  reporter: 7,
};

export const CANONICAL_ROLE_DISPLAY_NAMES: Record<string, string> = {
  superadmin: 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Administrator',
  regional_manager: 'Regional Manager',
  coordinator: 'Koordinator',
  integrity_investigator: 'Integrity Investigator',
  qc_leader: 'QC Leader',
  pic_maintenance: 'PIC Maintenance',
  reporter: 'Reporter',
};

/**
 * Returns canonical display name for a role key or display name.
 */
export function getRoleDisplayName(roleKey?: string | null, customDisplayName?: string | null): string {
  if (!roleKey && !customDisplayName) return 'Pengguna';
  const key = (roleKey || '').trim().toLowerCase();
  if (CANONICAL_ROLE_DISPLAY_NAMES[key]) {
    return CANONICAL_ROLE_DISPLAY_NAMES[key];
  }
  if (customDisplayName && customDisplayName.trim()) {
    const customNorm = customDisplayName.trim().toLowerCase();
    if (customNorm.includes('super')) return 'Super Admin';
    if (customNorm.includes('pic') || customNorm.includes('maintenance')) return 'PIC Maintenance';
    if (customNorm.includes('reporter') || customNorm.includes('operator')) return 'Reporter';
    if (customNorm.includes('coordinator') || customNorm.includes('koordinator') || customNorm.includes('officer')) return 'Koordinator';
    if (customNorm.includes('qc')) return 'QC Leader';
    if (customNorm.includes('regional')) return 'Regional Manager';
    if (customNorm.includes('admin')) return 'Administrator';
    return customDisplayName.trim();
  }
  return roleKey?.replace(/_/g, ' ') || 'Pengguna';
}

/**
 * Deterministically sorts role keys according to canonical seniority hierarchy.
 */
export function sortRoles<T extends string | { name: string }>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const keyA = (typeof a === 'string' ? a : a.name).trim().toLowerCase();
    const keyB = (typeof b === 'string' ? b : b.name).trim().toLowerCase();
    const orderA = CANONICAL_ROLE_ORDER[keyA] ?? 99;
    const orderB = CANONICAL_ROLE_ORDER[keyB] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return keyA.localeCompare(keyB);
  });
}

/**
 * Formats a multi-role string deterministically (e.g. "QC Leader • PIC Maintenance" or "QC Leader • PIC Maintenance • +1").
 */
export function formatMultiRoleString(
  roles?: string[] | null,
  options?: {
    isSuperAdmin?: boolean;
    maxVisible?: number;
    fallback?: string;
  }
): string {
  if (options?.isSuperAdmin) {
    return 'Super Admin';
  }

  if (!roles || roles.length === 0) {
    return options?.fallback || 'Pengguna';
  }

  const sorted = sortRoles(roles);
  const displayNames = sorted.map((r) => getRoleDisplayName(r));
  const max = options?.maxVisible ?? 2;

  if (displayNames.length <= max) {
    return displayNames.join(' • ');
  }

  const visible = displayNames.slice(0, max);
  const remaining = displayNames.length - max;
  return `${visible.join(' • ')} • +${remaining}`;
}

/**
 * Generates deterministic 1-2 character initials for user avatars.
 * Examples:
 * - "Bagus Maulana" -> "BM"
 * - "Admin System" -> "AS"
 * - "Fijar" -> "F"
 * - "" / null -> "U"
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

