// lib/integrity/crypto.ts
// Cryptographic utilities for WACT Integrity Center
// High-entropy report codes, secret generation, and constant-time secret verification.

import crypto from 'crypto';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32-like, unambiguous (no 0, 1, I, O)

/**
 * Generates a random, non-sequential report code.
 * Example: INT-PDL-8K2M4X or INT-BDG-9P7N2Y
 */
export function generateReportCode(warehouseCode: string = 'WACT'): string {
  const cleanCode = (warehouseCode || 'WACT').trim().toUpperCase().slice(0, 3);
  let randomPart = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    randomPart += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `INT-${cleanCode}-${randomPart}`;
}

/**
 * Generates a high-entropy formatted access secret for the anonymous reporter.
 * Example: WACT-INT-8K2M-9P4X-7R3V-1A5B
 */
export function generateAccessSecret(): string {
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let seg = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      seg += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    }
    segments.push(seg);
  }
  return `WACT-INT-${segments.join('-')}`;
}

/**
 * Generates a deterministic SHA-256 cryptographic hash of the access secret.
 * Normalizes input (trims, uppercase) so minor user formatting typos don't break valid access.
 */
export function hashAccessSecret(secret: string): string {
  const normalized = (secret || '').trim().toUpperCase().replace(/\s+/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verifies user-provided access secret against stored hash using constant-time comparison.
 * Prevents timing attacks.
 */
export function verifyAccessSecret(providedSecret: string, storedHash: string): boolean {
  if (!providedSecret || !storedHash) return false;
  try {
    const computedHash = hashAccessSecret(providedSecret);
    const bufA = Buffer.from(computedHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
