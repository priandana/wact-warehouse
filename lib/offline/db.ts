// lib/offline/db.ts
// IndexedDB schema using Dexie.js
// ALL offline persistence goes here. localStorage = UI prefs only.
//
// Evidence upload flow (correct order):
//   1. User selects photos on Step 4
//   2. Compress → store Blob in pendingEvidences (referenceId = draftCase.id)
//   3. Go online → create_case() RPC → receive server case_id
//   4. Upload each pending Blob to: case-evidences/{warehouseId}/{caseId}/{uuid}.jpg
//   5. Call add_case_evidence() RPC with signed storage path
//   6. On success: delete Blob from pendingEvidences
//   7. On failure: keep in pendingEvidences, retry later, show "pending upload" state in UI
//
// Idempotency:
//   - DraftCase.clientRequestId = crypto.randomUUID() generated once when draft is created.
//   - This UUID is passed as p_client_request_id to create_case() RPC.
//   - Same clientRequestId + same reporter → server returns existing case_id.
//   - Safe to retry after timeout/reconnect without creating duplicate cases.

import Dexie, { type Table } from 'dexie';

// ── Type definitions ────────────────────────────────────────────────────────

export interface DraftCase {
  /** Local UUID — also used as referenceId in pendingEvidences until case is created */
  id: string;
  /**
   * Idempotency key — generated ONCE when the draft is first created.
   * Passed to create_case() as p_client_request_id.
   * Never regenerated, even across retries.
   */
  clientRequestId: string;
  warehouseId: string;
  lastStep: number;       // 1–4 (last saved step)
  formData: {
    step1?: {
      categoryId?: string;
      subcategoryId?: string;
      title?: string;
      description?: string;
    };
    step2?: {
      areaId?: string;
      locationId?: string;
      assetId?: string;
    };
    step3?: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      hasOperationalImpact?: boolean;
      requiresMaintenance?: boolean;
      description?: string;
    };
    // Step 4: photos stored separately in pendingEvidences (referenceId = draft.id)
  };
  /**
   * Set after create_case() succeeds.
   * Non-null = case was created, pending evidences can be uploaded.
   */
  serverCaseId?: string;
  createdAt: number;      // epoch ms
  updatedAt: number;
}

export interface DraftInspection {
  id: string;             // local UUID
  assetId: string;
  warehouseId: string;
  templateId: string;
  results: Record<string, 'ok' | 'ng' | 'na'>;  // itemId → value
  notes: Record<string, string>;                  // itemId → note
  createdAt: number;
  updatedAt: number;
}

/**
 * PendingEvidence stores compressed image Blobs locally until they can be
 * uploaded after the case is created and a case_id is available.
 *
 * referenceId lifecycle:
 *   - Before case created: referenceId = draftCase.id (local UUID)
 *   - After case created:  referenceId = serverCaseId (server UUID)
 *
 * uploadStatus:
 *   'pending'    — not yet uploaded (case not yet created, or upload failed)
 *   'uploading'  — currently in progress (set by syncQueue flush)
 *   'uploaded'   — upload + add_case_evidence() both succeeded
 *
 * Uploaded evidences are deleted from IndexedDB after success.
 * Only 'pending' and 'uploading' items remain here.
 */
export interface PendingEvidence {
  id: string;                                   // local UUID
  referenceType: 'case' | 'inspection';
  referenceId: string;                          // local draftCase.id OR server case_id
  warehouseId: string;                          // needed to build storage path
  phase: 'before' | 'during' | 'after';
  blob: Blob;                                   // compressed image Blob
  filename: string;
  mimeType: string;
  fileSize: number;
  caption?: string;
  uploadStatus: 'pending' | 'uploading' | 'uploaded';
  /** Set after Storage upload succeeds — used to call add_case_evidence() */
  storagePath?: string;
  queuedAt: number;
  lastAttemptAt?: number;
  lastError?: string;
}

export interface SyncQueueItem {
  id: string;             // local UUID
  type: 'create_case' | 'submit_inspection' | 'upload_evidence' | 'add_comment';
  payload: Record<string, unknown>;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
  createdAt: number;
}

// ── DB class ────────────────────────────────────────────────────────────────

class WACTOfflineDB extends Dexie {
  draftCases!: Table<DraftCase>;
  draftInspections!: Table<DraftInspection>;
  pendingEvidences!: Table<PendingEvidence>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('wact-offline-v1');

    this.version(1).stores({
      draftCases:       'id, clientRequestId, warehouseId, updatedAt',
      draftInspections: 'id, assetId, warehouseId, updatedAt',
      // index on referenceId for fast lookup when case is created
      pendingEvidences: 'id, referenceId, uploadStatus, queuedAt',
      syncQueue:        'id, type, createdAt',
    });
  }
}

// Singleton — only instantiated in browser
let _db: WACTOfflineDB | null = null;

export function getOfflineDB(): WACTOfflineDB {
  if (typeof window === 'undefined') {
    throw new Error('getOfflineDB() must only be called in the browser');
  }
  if (!_db) {
    _db = new WACTOfflineDB();
  }
  return _db;
}
