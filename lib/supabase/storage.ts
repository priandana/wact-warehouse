// lib/supabase/storage.ts
// Supabase Storage helpers for WACT.
// ALL buckets are PRIVATE — use signed URLs, never public URLs.

import { createClient } from './client';

export const BUCKETS = {
  CASE_EVIDENCES:       'case-evidences',
  INSPECTION_EVIDENCES: 'inspection-evidences',
  ASSET_PHOTOS:         'asset-photos',
  AVATARS:              'avatars',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * Structured object paths (enforced as a naming convention):
 *
 *   case-evidences/{warehouseId}/{caseId}/{uuid}.jpg
 *   inspection-evidences/{warehouseId}/{inspectionId}/{uuid}.jpg
 *   asset-photos/{warehouseId}/{assetId}/{uuid}.jpg
 *   avatars/{userId}/{uuid}.jpg
 *
 * This structure is validated by Storage RLS policies (segment 1 = warehouseId).
 */
export function buildCaseEvidencePath(warehouseId: string, caseId: string, ext = 'jpg'): string {
  return `${warehouseId}/${caseId}/${crypto.randomUUID()}.${ext}`;
}

export function buildInspectionEvidencePath(warehouseId: string, inspectionId: string, ext = 'jpg'): string {
  return `${warehouseId}/${inspectionId}/${crypto.randomUUID()}.${ext}`;
}

export function buildAssetPhotoPath(warehouseId: string, assetId: string, ext = 'jpg'): string {
  return `${warehouseId}/${assetId}/${crypto.randomUUID()}.${ext}`;
}

export function buildAvatarPath(userId: string, ext = 'jpg'): string {
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

// ── Upload ────────────────────────────────────────────────────────────────

/**
 * Uploads a Blob to a private bucket.
 * Returns the storage path (NOT a URL — use createSignedUrl() to serve).
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Upload failed (${bucket}/${path}): ${error.message}`);

  return path; // return path, NOT public URL
}

// ── Signed URLs ───────────────────────────────────────────────────────────

/**
 * Creates a signed URL for a private file.
 * Default expiry: 3600 seconds (1 hour).
 * For display: create on-demand, cache in component state.
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown'}`);
  }

  return data.signedUrl;
}

/**
 * Creates signed URLs for multiple files in one call.
 * Supabase supports batch signed URL generation.
 */
export async function getSignedUrls(
  bucket: BucketName,
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Array<{ path: string; signedUrl: string }>> {
  if (paths.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresInSeconds);

  if (error) throw new Error(`Failed to create signed URLs: ${error.message}`);

  return (data ?? [])
    .filter((item): item is typeof item & { path: string } => item.path != null)
    .map((item) => ({
      path: item.path,
      signedUrl: item.signedUrl ?? '',
    }));
}

/**
 * Deletes a file from storage (called when evidence row is deleted via RPC).
 */
export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

// ── Image Compression ─────────────────────────────────────────────────────

/**
 * Compresses an image File before upload.
 * Browser-only (uses canvas API).
 *
 * @param file    - Source image File
 * @param maxPx   - Max dimension (width or height), default 1920
 * @param quality - JPEG quality 0–1, default 0.82
 */
export async function compressImage(
  file: File,
  maxPx = 1920,
  quality = 0.82,
): Promise<{ blob: Blob; contentType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas 2d context unavailable')); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('canvas.toBlob returned null')); return; }
          resolve({ blob, contentType: 'image/jpeg' });
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = objectUrl;
  });
}

/**
 * Full pipeline: compress → upload → return storage path.
 * Use the returned path to insert into DB evidence row,
 * then use getSignedUrl() to display.
 */
export async function compressAndUpload(
  bucket: BucketName,
  path: string,
  file: File,
): Promise<string> {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    const { blob, contentType } = await compressImage(file);
    return uploadFile(bucket, path, blob, contentType);
  }

  // Non-image (PDF, video): upload as-is
  return uploadFile(bucket, path, file, file.type);
}
