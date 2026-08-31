// lib/integrity/actions.ts
'use server';

// Server Actions for WACT Integrity Center
// Public anonymous submission & tracking (zero identity capture) + Investigator workflows.
// Hardened with separate secrets table and granular capability guards.

import { revalidatePath } from 'next/cache';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import {
  generateReportCode,
  generateAccessSecret,
  hashAccessSecret,
  verifyAccessSecret,
} from './crypto';
import { sanitizeServerImage } from './imageSanitizer';
import {
  type IntegrityCategory,
  type IntegritySeverity,
  type IntegrityStatus,
  type PublicTrackedReport,
  INTEGRITY_CATEGORIES,
  INTEGRITY_STATUSES,
} from './types';
import { Capability } from '@/lib/permissions/capabilities';
import { hasCapability } from '@/lib/permissions/resolveCapabilities';

// ══════════════════════════════════════════════════════════════════════════════
// 1. PUBLIC ANONYMOUS SUBMISSION (CREDENTIAL-FREE / ZERO IDENTITY LOGGING)
// ══════════════════════════════════════════════════════════════════════════════

export interface SubmitReportInput {
  warehouseId: string;
  category: IntegrityCategory;
  description: string;
  incidentDatetime?: string | null;
  areaId?: string | null;
  locationId?: string | null;
  estimatedLoss?: number | null;
  involvedPartyDescription?: string | null;
  photoBase64?: string | null;
  photoMimeType?: string | null;
  photoCaption?: string | null;
}

export interface SubmitReportResponse {
  success: boolean;
  reportCode?: string;
  accessSecret?: string;
  error?: string;
}

export async function submitAnonymousReport(
  input: SubmitReportInput
): Promise<SubmitReportResponse> {
  try {
    // 1. Validate mandatory fields
    if (!input.warehouseId || !input.warehouseId.trim()) {
      return { success: false, error: 'Gudang wajib dipilih.' };
    }
    if (!input.category || !INTEGRITY_CATEGORIES[input.category]) {
      return { success: false, error: 'Kategori laporan tidak valid.' };
    }
    if (!input.description || input.description.trim().length < 10) {
      return { success: false, error: 'Kronologi kejadian minimal 10 karakter.' };
    }

    const adminClient = createAdminClient();

    // 2. Fetch warehouse code to format the human-readable report code
    const { data: warehouse, error: whErr } = await adminClient
      .from('warehouses')
      .select('id, code, is_active')
      .eq('id', input.warehouseId)
      .single();

    if (whErr || !warehouse || !warehouse.is_active) {
      return { success: false, error: 'Gudang yang dipilih tidak aktif atau tidak ditemukan.' };
    }

    // 3. Generate random report code and high-entropy access secret
    const reportCode = generateReportCode(warehouse.code);
    const accessSecret = generateAccessSecret();
    const accessSecretHash = hashAccessSecret(accessSecret);

    // 4. Determine initial severity based on category default or estimated loss
    let initialSeverity: IntegritySeverity = 'medium';
    if (input.category === 'theft' || input.category === 'stock_manipulation' || input.category === 'supplier_vendor_collusion') {
      if (input.estimatedLoss && input.estimatedLoss >= 10000000) {
        initialSeverity = 'critical';
      } else if (input.estimatedLoss && input.estimatedLoss >= 2000000) {
        initialSeverity = 'high';
      } else {
        initialSeverity = 'medium';
      }
    } else if (input.category === 'unauthorized_consumption' || input.category === 'other') {
      initialSeverity = 'low';
    }

    // 5. Insert main report row (ABSOLUTELY NO user_id, email, IP, or user-agent)
    const { data: report, error: reportErr } = await adminClient
      .from('integrity_reports')
      .insert({
        report_code: reportCode,
        warehouse_id: input.warehouseId,
        area_id: input.areaId || null,
        location_id: input.locationId || null,
        category: input.category,
        severity: initialSeverity,
        status: 'submitted',
        incident_datetime: input.incidentDatetime || null,
        description: input.description.trim(),
        estimated_loss: input.estimatedLoss || null,
        involved_party_description: input.involvedPartyDescription?.trim() || null,
      })
      .select('id')
      .single();

    if (reportErr || !report) {
      return { success: false, error: 'Gagal menyimpan laporan. Silakan coba sesaat lagi.' };
    }

    // 6. Insert into isolated secrets table (Zero client access)
    const { error: secretErr } = await adminClient
      .from('integrity_report_secrets')
      .insert({
        report_id: report.id,
        access_secret_hash: accessSecretHash,
      });

    if (secretErr) {
      // Rollback main report if secret insertion fails
      await adminClient.from('integrity_reports').delete().eq('id', report.id);
      return { success: false, error: 'Gagal mengamankan kunci akses laporan.' };
    }

    // 7. Handle optional photo attachment with server-side metadata sanitization
    if (input.photoBase64 && input.photoBase64.trim()) {
      try {
        const rawBuffer = Buffer.from(input.photoBase64, 'base64');
        const { sanitizedBuffer, contentType, extension } = sanitizeServerImage(
          rawBuffer,
          input.photoMimeType || 'image/jpeg'
        );
        const randomId = crypto.randomUUID();
        const storagePath = `${input.warehouseId}/${report.id}/${randomId}.${extension}`;

        const { error: uploadErr } = await adminClient.storage
          .from('integrity-evidences')
          .upload(storagePath, sanitizedBuffer, {
            contentType,
            upsert: false,
          });

        if (!uploadErr) {
          await adminClient.from('integrity_evidences').insert({
            report_id: report.id,
            storage_path: storagePath,
            file_name: `bukti-laporan-1.${extension}`, // Sanitized file label (no client filename)
            file_size: sanitizedBuffer.length,
            mime_type: contentType,
            source_type: 'anonymous_reporter',
            caption: input.photoCaption?.trim() || 'Foto bukti saat pelaporan',
          });
        }
      } catch {
        // storage attachment failure is non-fatal to the main report
      }
    }

    // 8. Log immutable activity
    await adminClient.from('integrity_activities').insert({
      report_id: report.id,
      actor_type: 'anonymous_reporter',
      actor_id: null,
      action: 'report_submitted',
      from_status: null,
      to_status: 'submitted',
      metadata: { category: input.category, severity: initialSeverity },
    });

    return {
      success: true,
      reportCode,
      accessSecret,
    };
  } catch {
    return { success: false, error: 'Terjadi kesalahan sistem saat memproses laporan.' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. PUBLIC ANONYMOUS TRACKING & TWO-WAY MESSAGING
// ══════════════════════════════════════════════════════════════════════════════

export async function trackAnonymousReport(
  reportCode: string,
  accessSecret: string
): Promise<{ success: boolean; data?: PublicTrackedReport; error?: string }> {
  try {
    if (!reportCode || !reportCode.trim()) {
      return { success: false, error: 'Nomor laporan wajib diisi.' };
    }
    if (!accessSecret || !accessSecret.trim()) {
      return { success: false, error: 'Kode akses rahasia wajib diisi.' };
    }

    const adminClient = createAdminClient();
    const cleanCode = reportCode.trim().toUpperCase();

    // 1. Fetch report by report_code
    const { data: report, error: reportErr } = await adminClient
      .from('integrity_reports')
      .select(`
        id,
        report_code,
        category,
        severity,
        status,
        incident_datetime,
        description,
        estimated_loss,
        involved_party_description,
        resolution_notes,
        created_at,
        updated_at,
        resolved_at,
        warehouses:warehouse_id ( id, name, code )
      `)
      .eq('report_code', cleanCode)
      .single();

    if (reportErr || !report) {
      return { success: false, error: 'Nomor laporan atau kode akses tidak valid.' };
    }

    // 2. Fetch secret hash from isolated secrets table
    const { data: secretRow, error: secretErr } = await adminClient
      .from('integrity_report_secrets')
      .select('access_secret_hash')
      .eq('report_id', report.id)
      .single();

    if (secretErr || !secretRow?.access_secret_hash) {
      return { success: false, error: 'Nomor laporan atau kode akses tidak valid.' };
    }

    // 3. Verify access secret using constant-time hash comparison
    const isValidSecret = verifyAccessSecret(accessSecret, secretRow.access_secret_hash);
    if (!isValidSecret) {
      return { success: false, error: 'Nomor laporan atau kode akses tidak valid.' };
    }

    // 4. Fetch public-safe messages
    const { data: messages } = await adminClient
      .from('integrity_messages')
      .select('id, sender_type, message, created_at')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true });

    // 5. Fetch public-safe evidences and create short-lived signed URLs
    const { data: evidences } = await adminClient
      .from('integrity_evidences')
      .select('id, message_id, storage_path, file_name, caption, created_at, source_type')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true });

    const formattedEvidences = await Promise.all(
      (evidences || []).map(async (ev) => {
        let signedUrl = '';
        try {
          const { data: signData } = await adminClient.storage
            .from('integrity-evidences')
            .createSignedUrl(ev.storage_path, 3600); // 1 hour
          signedUrl = signData?.signedUrl || '';
        } catch {
          // ignore signed URL error
        }
        return {
          id: ev.id,
          message_id: ev.message_id,
          file_name: ev.file_name,
          signed_url: signedUrl,
          caption: ev.caption,
          created_at: ev.created_at,
          source_type: ev.source_type as 'anonymous_reporter' | 'investigator',
        };
      })
    );

    // Map evidences to messages if applicable
    const formattedMessages = (messages || []).map((m) => ({
      id: m.id,
      sender_type: m.sender_type as 'anonymous_reporter' | 'investigator',
      message: m.message,
      created_at: m.created_at,
      evidences: formattedEvidences
        .filter((e) => e.message_id === m.id)
        .map((e) => ({
          id: e.id,
          file_name: e.file_name,
          signed_url: e.signed_url,
          caption: e.caption,
        })),
    }));

    // Warehouse resolution (handle array/object type from Supabase join)
    const whObj = Array.isArray(report.warehouses) ? report.warehouses[0] : report.warehouses;
    const warehouseName = whObj?.name || 'Gudang WACT';
    const warehouseCode = whObj?.code || 'WACT';

    const categoryMeta = INTEGRITY_CATEGORIES[report.category as IntegrityCategory];
    const statusMeta = INTEGRITY_STATUSES[report.status as IntegrityStatus];

    const result: PublicTrackedReport = {
      report_code: report.report_code,
      warehouse_name: warehouseName,
      warehouse_code: warehouseCode,
      category: report.category as IntegrityCategory,
      category_label: categoryMeta?.label || report.category,
      status: report.status as IntegrityStatus,
      status_label: statusMeta?.label || report.status,
      severity: report.severity as IntegritySeverity,
      incident_datetime: report.incident_datetime,
      description: report.description,
      estimated_loss: report.estimated_loss ? Number(report.estimated_loss) : null,
      involved_party_description: report.involved_party_description,
      resolution_notes: report.resolution_notes,
      created_at: report.created_at,
      updated_at: report.updated_at,
      resolved_at: report.resolved_at,
      messages: formattedMessages,
      evidences: formattedEvidences.map((e) => ({
        id: e.id,
        file_name: e.file_name,
        signed_url: e.signed_url,
        caption: e.caption,
        created_at: e.created_at,
        source_type: e.source_type,
      })),
    };

    return { success: true, data: result };
  } catch {
    return { success: false, error: 'Terjadi kesalahan sistem saat mencari laporan.' };
  }
}

export async function sendAnonymousReply(
  reportCode: string,
  accessSecret: string,
  messageText: string,
  photoBase64?: string | null,
  photoMimeType?: string | null,
  photoCaption?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!reportCode || !accessSecret) {
      return { success: false, error: 'Otorisasi pelacak tidak valid.' };
    }
    if (!messageText || !messageText.trim()) {
      return { success: false, error: 'Pesan balasan tidak boleh kosong.' };
    }

    const adminClient = createAdminClient();
    const cleanCode = reportCode.trim().toUpperCase();

    // 1. Fetch report
    const { data: report, error: reportErr } = await adminClient
      .from('integrity_reports')
      .select('id, warehouse_id, status')
      .eq('report_code', cleanCode)
      .single();

    if (reportErr || !report) {
      return { success: false, error: 'Akses tidak sah.' };
    }

    // 2. Fetch secret hash and verify
    const { data: secretRow } = await adminClient
      .from('integrity_report_secrets')
      .select('access_secret_hash')
      .eq('report_id', report.id)
      .single();

    if (!secretRow?.access_secret_hash || !verifyAccessSecret(accessSecret, secretRow.access_secret_hash)) {
      return { success: false, error: 'Akses tidak sah.' };
    }

    // 3. Insert message (sender_type: 'anonymous_reporter', sender_id: null)
    const { data: insertedMsg, error: msgErr } = await adminClient
      .from('integrity_messages')
      .insert({
        report_id: report.id,
        sender_type: 'anonymous_reporter',
        sender_id: null,
        message: messageText.trim(),
      })
      .select('id')
      .single();

    if (msgErr || !insertedMsg) {
      return { success: false, error: 'Gagal mengirim pesan balasan.' };
    }

    // 4. Handle optional follow-up photo with server-side metadata sanitization
    if (photoBase64 && photoBase64.trim()) {
      try {
        const rawBuffer = Buffer.from(photoBase64, 'base64');
        const { sanitizedBuffer, contentType, extension } = sanitizeServerImage(
          rawBuffer,
          photoMimeType || 'image/jpeg'
        );
        const randomId = crypto.randomUUID();
        const storagePath = `${report.warehouse_id}/${report.id}/${randomId}.${extension}`;

        const { error: uploadErr } = await adminClient.storage
          .from('integrity-evidences')
          .upload(storagePath, sanitizedBuffer, {
            contentType,
            upsert: false,
          });

        if (!uploadErr) {
          await adminClient.from('integrity_evidences').insert({
            report_id: report.id,
            message_id: insertedMsg.id,
            storage_path: storagePath,
            file_name: `bukti-lanjutan.${extension}`,
            file_size: sanitizedBuffer.length,
            mime_type: contentType,
            source_type: 'anonymous_reporter',
            caption: photoCaption?.trim() || 'Foto tambahan dari pelapor',
          });
        }
      } catch {
        // ignore photo upload catch
      }
    }

    // 5. Log activity
    await adminClient.from('integrity_activities').insert({
      report_id: report.id,
      actor_type: 'anonymous_reporter',
      actor_id: null,
      action: 'message_sent',
      metadata: { has_photo: Boolean(photoBase64) },
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Gagal mengirim pesan.' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. INVESTIGATOR WORKFLOW ACTIONS (AUTHENTICATED & CAPABILITY-CHECKED)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validates that current authenticated user holds the required Integrity capability in the given warehouse.
 */
async function requireInvestigatorCapability(
  warehouseId: string,
  capability: Capability
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { authorized: false, error: 'Sesi login telah berakhir. Silakan login kembali.' };
  }

  const authorized = await hasCapability(user.id, warehouseId, capability);
  if (!authorized) {
    return { authorized: false, error: 'Akses ditolak. Anda tidak memiliki izin investigasi integritas untuk tindakan ini.' };
  }

  return { authorized: true, userId: user.id };
}

export async function updateReportStatus(
  reportId: string,
  warehouseId: string,
  newStatus: IntegrityStatus,
  resolutionNotes?: string,
  resolutionAction?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Granular capability check: resolving requires INTEGRITY_RESOLVE; ongoing transitions require INTEGRITY_INVESTIGATE
    const requiredCap = (newStatus === 'resolved' || newStatus === 'unsubstantiated' || newStatus === 'duplicate')
      ? Capability.INTEGRITY_RESOLVE
      : Capability.INTEGRITY_INVESTIGATE;

    const authCheck = await requireInvestigatorCapability(warehouseId, requiredCap);
    if (!authCheck.authorized || !authCheck.userId) {
      return { success: false, error: authCheck.error };
    }

    const adminClient = createAdminClient();

    // Fetch current status
    const { data: currentReport, error: fetchErr } = await adminClient
      .from('integrity_reports')
      .select('status')
      .eq('id', reportId)
      .single();

    if (fetchErr || !currentReport) {
      return { success: false, error: 'Laporan tidak ditemukan.' };
    }

    const updatePayload: {
      status: IntegrityStatus;
      updated_at: string;
      resolved_at?: string | null;
      resolution_notes?: string | null;
      resolution_action?: string | null;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'resolved' || newStatus === 'unsubstantiated' || newStatus === 'duplicate') {
      updatePayload.resolved_at = new Date().toISOString();
      if (resolutionNotes) updatePayload.resolution_notes = resolutionNotes.trim();
      if (resolutionAction) updatePayload.resolution_action = resolutionAction.trim();
    }

    const { error: updateErr } = await adminClient
      .from('integrity_reports')
      .update(updatePayload)
      .eq('id', reportId);

    if (updateErr) {
      return { success: false, error: 'Gagal memperbarui status laporan.' };
    }

    // Log activity
    await adminClient.from('integrity_activities').insert({
      report_id: reportId,
      actor_type: 'investigator',
      actor_id: authCheck.userId,
      action: 'status_changed',
      from_status: currentReport.status,
      to_status: newStatus,
      metadata: {
        resolution_action: resolutionAction || null,
        resolution_notes: resolutionNotes || null,
      },
    });

    revalidatePath(`/integrity/${reportId}`);
    revalidatePath('/integrity');
    return { success: true };
  } catch {
    return { success: false, error: 'Terjadi kesalahan saat memperbarui status.' };
  }
}

export async function changeReportSeverity(
  reportId: string,
  warehouseId: string,
  newSeverity: IntegritySeverity
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireInvestigatorCapability(warehouseId, Capability.INTEGRITY_CHANGE_SEVERITY);
    if (!authCheck.authorized || !authCheck.userId) {
      return { success: false, error: authCheck.error };
    }

    const adminClient = createAdminClient();

    const { data: currentReport } = await adminClient
      .from('integrity_reports')
      .select('severity')
      .eq('id', reportId)
      .single();

    const { error: updateErr } = await adminClient
      .from('integrity_reports')
      .update({ severity: newSeverity, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (updateErr) {
      return { success: false, error: 'Gagal mengubah tingkat keparahan.' };
    }

    await adminClient.from('integrity_activities').insert({
      report_id: reportId,
      actor_type: 'investigator',
      actor_id: authCheck.userId,
      action: 'severity_changed',
      metadata: { from_severity: currentReport?.severity, to_severity: newSeverity },
    });

    revalidatePath(`/integrity/${reportId}`);
    revalidatePath('/integrity');
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal mengubah keparahan kasus.' };
  }
}

export async function assignInvestigator(
  reportId: string,
  warehouseId: string,
  investigatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireInvestigatorCapability(warehouseId, Capability.INTEGRITY_ASSIGN);
    if (!authCheck.authorized || !authCheck.userId) {
      return { success: false, error: authCheck.error };
    }

    const adminClient = createAdminClient();

    // Verify candidate profile exists and is active
    const { data: candidate } = await adminClient
      .from('profiles')
      .select('id, full_name, is_active')
      .eq('id', investigatorId)
      .single();

    if (!candidate || !candidate.is_active) {
      return { success: false, error: 'Penyelidik yang dipilih tidak aktif.' };
    }

    // Update assignment history
    await adminClient
      .from('integrity_assignments')
      .update({ is_current: false, unassigned_at: new Date().toISOString() })
      .eq('report_id', reportId)
      .eq('is_current', true);

    await adminClient.from('integrity_assignments').insert({
      report_id: reportId,
      investigator_id: investigatorId,
      assigned_by: authCheck.userId,
      is_current: true,
    });

    // Update report
    await adminClient
      .from('integrity_reports')
      .update({ assigned_investigator_id: investigatorId, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    // Log activity
    await adminClient.from('integrity_activities').insert({
      report_id: reportId,
      actor_type: 'investigator',
      actor_id: authCheck.userId,
      action: 'investigator_assigned',
      metadata: { assigned_to: candidate.full_name, assignee_id: investigatorId },
    });

    revalidatePath(`/integrity/${reportId}`);
    revalidatePath('/integrity');
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal menugaskan investigator.' };
  }
}

export async function sendInvestigatorMessage(
  reportId: string,
  warehouseId: string,
  messageText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireInvestigatorCapability(warehouseId, Capability.INTEGRITY_MESSAGE);
    if (!authCheck.authorized || !authCheck.userId) {
      return { success: false, error: authCheck.error };
    }

    if (!messageText || !messageText.trim()) {
      return { success: false, error: 'Pesan tidak boleh kosong.' };
    }

    const adminClient = createAdminClient();

    const { error: insertErr } = await adminClient
      .from('integrity_messages')
      .insert({
        report_id: reportId,
        sender_type: 'investigator',
        sender_id: authCheck.userId,
        message: messageText.trim(),
      });

    if (insertErr) {
      return { success: false, error: 'Gagal mengirim pesan ke pelapor.' };
    }

    await adminClient.from('integrity_activities').insert({
      report_id: reportId,
      actor_type: 'investigator',
      actor_id: authCheck.userId,
      action: 'investigator_message_sent',
    });

    revalidatePath(`/integrity/${reportId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal mengirim pesan.' };
  }
}

export async function addInternalNote(
  reportId: string,
  warehouseId: string,
  noteText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireInvestigatorCapability(warehouseId, Capability.INTEGRITY_INTERNAL_NOTE);
    if (!authCheck.authorized || !authCheck.userId) {
      return { success: false, error: authCheck.error };
    }

    if (!noteText || !noteText.trim()) {
      return { success: false, error: 'Catatan internal tidak boleh kosong.' };
    }

    const adminClient = createAdminClient();

    const { error: insertErr } = await adminClient
      .from('integrity_internal_notes')
      .insert({
        report_id: reportId,
        author_id: authCheck.userId,
        note: noteText.trim(),
      });

    if (insertErr) {
      return { success: false, error: 'Gagal menambahkan catatan internal.' };
    }

    await adminClient.from('integrity_activities').insert({
      report_id: reportId,
      actor_type: 'investigator',
      actor_id: authCheck.userId,
      action: 'internal_note_added',
    });

    revalidatePath(`/integrity/${reportId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal menambahkan catatan internal.' };
  }
}

export async function uploadInvestigatorEvidence(
  reportId: string,
  warehouseId: string,
  photoBase64: string,
  mimeType: string = 'image/jpeg',
  caption?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireInvestigatorCapability(warehouseId, Capability.INTEGRITY_INVESTIGATE);
    if (!authCheck.authorized || !authCheck.userId) {
      return { success: false, error: authCheck.error };
    }

    const adminClient = createAdminClient();
    const rawBuffer = Buffer.from(photoBase64, 'base64');
    const { sanitizedBuffer, contentType, extension } = sanitizeServerImage(rawBuffer, mimeType);
    const randomId = crypto.randomUUID();
    const storagePath = `${warehouseId}/${reportId}/${randomId}.${extension}`;

    const { error: uploadErr } = await adminClient.storage
      .from('integrity-evidences')
      .upload(storagePath, sanitizedBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadErr) {
      return { success: false, error: 'Gagal mengunggah foto bukti investigasi.' };
    }

    await adminClient.from('integrity_evidences').insert({
      report_id: reportId,
      storage_path: storagePath,
      file_name: `bukti-investigasi-${randomId.slice(0, 6)}.${extension}`,
      file_size: sanitizedBuffer.length,
      mime_type: contentType,
      source_type: 'investigator',
      caption: caption?.trim() || 'Foto temuan dari tim investigasi',
    });

    await adminClient.from('integrity_activities').insert({
      report_id: reportId,
      actor_type: 'investigator',
      actor_id: authCheck.userId,
      action: 'evidence_uploaded',
      metadata: { source_type: 'investigator' },
    });

    revalidatePath(`/integrity/${reportId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal mengunggah bukti.' };
  }
}
