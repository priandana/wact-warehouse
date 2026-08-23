// lib/offline/syncQueue.ts
// Sync queue flush — handles offline → online reconnection.
//
// Evidence upload order:
//   create_case (get server case_id)
//     → update pendingEvidences.referenceId to serverCaseId
//     → upload Blob to Storage
//     → call add_case_evidence() RPC
//     → delete Blob from pendingEvidences
//
// If create_case succeeds but evidence upload fails:
//   - Case is NOT duplicated (idempotency via clientRequestId)
//   - pendingEvidences remain with original referenceId = draftCase.id
//   - On next sync, case lookup by clientRequestId returns existing serverCaseId
//   - Evidence upload retried independently

import { createClient } from '@/lib/supabase/client';
import {
  getOfflineDB,
  type SyncQueueItem,
  type PendingEvidence,
} from './db';
import {
  BUCKETS,
  buildCaseEvidencePath,
  uploadFile,
} from '@/lib/supabase/storage';

// ── Sync Queue Operations ─────────────────────────────────────────────────

export async function addToSyncQueue(
  type: SyncQueueItem['type'],
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getOfflineDB();
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    type,
    payload,
    attempts: 0,
    createdAt: Date.now(),
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const db = getOfflineDB();
  return db.syncQueue.count();
}

/**
 * Flushes all pending sync queue items + pending evidence uploads.
 * Called on reconnect by useReconnect() hook.
 *
 * Order:
 *   1. create_case items (so case_ids become available)
 *   2. upload_evidence items (depend on case_ids)
 *   3. add_comment items
 */
export async function flushSyncQueue(): Promise<void> {
  const db = getOfflineDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;


  // ── Step 1: flush create_case items ──────────────────────────────────────
  const createItems = await db.syncQueue
    .where('type')
    .equals('create_case')
    .toArray();

  for (const item of createItems) {
    try {
      const payload = item.payload as {
        draftCaseId: string;
        clientRequestId: string;
        warehouseId: string;
        title: string;
        [key: string]: unknown;
      };

      const { data: serverCaseId, error } = await supabase.rpc('create_case', {
        p_warehouse_id:            payload.warehouseId,
        p_title:                   payload.title,
        p_description:             payload.description ?? null,
        p_category_id:             payload.categoryId ?? null,
        p_subcategory_id:          payload.subcategoryId ?? null,
        p_area_id:                 payload.areaId ?? null,
        p_location_id:             payload.locationId ?? null,
        p_asset_id:                payload.assetId ?? null,
        p_priority:                payload.priority ?? 'medium',
        p_has_operational_impact:  payload.hasOperationalImpact ?? false,
        p_requires_maintenance:    payload.requiresMaintenance ?? false,
        p_source:                  payload.source ?? 'direct',
        p_due_date:                payload.dueDate ?? null,
        p_client_request_id:       payload.clientRequestId,  // idempotency key
      });

      if (error) throw new Error(error.message);

      // Update draft with server case_id
      await db.draftCases.update(payload.draftCaseId, {
        serverCaseId: serverCaseId as string,
        updatedAt: Date.now(),
      });

      // Update pending evidences: referenceId = draftCaseId → serverCaseId
      // so the evidence flush step can find them
      await db.pendingEvidences
        .where('referenceId')
        .equals(payload.draftCaseId)
        .modify({ referenceId: serverCaseId as string });

      // Remove from sync queue
      await db.syncQueue.delete(item.id);
    } catch (err) {
      await db.syncQueue.update(item.id, {
        attempts: item.attempts + 1,
        lastAttemptAt: Date.now(),
        lastError: String(err),
      });
    }
  }

  // ── Step 2: upload pending evidences ─────────────────────────────────────
  // Only evidences where referenceId is a server case_id (UUID from DB)
  // and uploadStatus = 'pending'
  const pendingEvidences = await db.pendingEvidences
    .where('uploadStatus')
    .equals('pending')
    .toArray();

  for (const evidence of pendingEvidences) {
    // Skip evidences still referencing a local draftCaseId
    // (their create_case may have failed above — will retry next flush)
    const draft = await db.draftCases.get(evidence.referenceId);
    if (draft && !draft.serverCaseId) {
      // create_case hasn't succeeded yet — skip
      continue;
    }

    // The referenceId is now the server case_id
    const serverCaseId = evidence.referenceId;

    try {
      // Mark as uploading
      await db.pendingEvidences.update(evidence.id, {
        uploadStatus: 'uploading',
        lastAttemptAt: Date.now(),
      });

      // Build structured storage path
      const ext = evidence.mimeType.split('/')[1] ?? 'jpg';
      const storagePath = buildCaseEvidencePath(evidence.warehouseId, serverCaseId, ext);

      // Upload Blob to Storage
      await uploadFile(BUCKETS.CASE_EVIDENCES, storagePath, evidence.blob, evidence.mimeType);

      // Call add_case_evidence() RPC
      const { error } = await supabase.rpc('add_case_evidence', {
        p_case_id:   serverCaseId,
        p_phase:     evidence.phase,
        p_file_url:  storagePath,
        p_file_name: evidence.filename,
        p_file_size: evidence.fileSize,
        p_mime_type: evidence.mimeType,
        p_caption:   evidence.caption ?? null,
      });

      if (error) throw new Error(error.message);

      // Success — delete Blob from IndexedDB
      await db.pendingEvidences.delete(evidence.id);
    } catch (err) {
      await db.pendingEvidences.update(evidence.id, {
        uploadStatus: 'pending',    // reset to pending for retry
        lastAttemptAt: Date.now(),
        lastError: String(err),
      });
    }
  }

  // ── Step 3: flush add_comment items ──────────────────────────────────────
  const commentItems = await db.syncQueue
    .where('type')
    .equals('add_comment')
    .toArray();

  for (const item of commentItems) {
    try {
      const { error } = await supabase.rpc('add_case_comment', {
        p_case_id:    item.payload.caseId,
        p_content:    item.payload.content,
        p_is_internal: item.payload.isInternal ?? false,
      });

      if (error) throw new Error(error.message);
      await db.syncQueue.delete(item.id);
    } catch (err) {
      await db.syncQueue.update(item.id, {
        attempts: item.attempts + 1,
        lastAttemptAt: Date.now(),
        lastError: String(err),
      });
    }
  }
}

// ── Pending evidence count for UI badge ──────────────────────────────────
export async function getPendingEvidenceCount(): Promise<number> {
  const db = getOfflineDB();
  return db.pendingEvidences.where('uploadStatus').anyOf(['pending', 'uploading']).count();
}
