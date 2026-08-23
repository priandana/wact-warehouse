'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface StartInspectionInput {
  warehouseId: string;
  assetId: string;
  templateId: string;
}

export interface SubmitInspectionResultInput {
  inspectionId: string;
  itemId: string;
  value: 'ok' | 'ng' | 'na';
  notes?: string | null;
}

export interface AddInspectionEvidenceInput {
  inspectionId: string;
  inspectionResultId: string;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  caption?: string | null;
}

export interface CancelInspectionInput {
  inspectionId: string;
  reason: string;
}

export interface CreateTemplateInput {
  name: string;
  categoryId?: string | null;
  description?: string | null;
  inspectionIntervalDays?: number | null;
  sections?: Array<{
    title: string;
    sortOrder: number;
    items: Array<{
      label: string;
      description?: string | null;
      isRequired: boolean;
      sortOrder: number;
    }>;
  }>;
}

/**
 * Server Action: Start a new QC Inspection
 * Calls authoritative database RPC: start_inspection()
 */
export async function startInspectionAction(input: StartInspectionInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!input.warehouseId || !input.assetId || !input.templateId) {
      return { success: false, error: 'Gudang, Aset, dan Template Inspeksi wajib dipilih.' };
    }

    const { data: inspectionId, error: rpcErr } = await supabase.rpc('start_inspection', {
      p_warehouse_id: input.warehouseId,
      p_asset_id: input.assetId,
      p_template_id: input.templateId,
    });

    if (rpcErr) {
      if (rpcErr.message.includes('uq_inspections_asset_draft') || rpcErr.message.includes('unique')) {
        return {
          success: false,
          error: 'Aset ini sedang memiliki inspeksi draft yang aktif. Silakan lanjutkan draft yang ada.',
          isDraftConflict: true,
        };
      }
      return { success: false, error: rpcErr.message || 'Gagal memulai inspeksi.' };
    }

    revalidatePath('/inspections');
    return { success: true, inspectionId: inspectionId as string };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memulai inspeksi.',
    };
  }
}

/**
 * Server Action: Submit or Update Checklist Result for an Item
 * Calls authoritative database RPC: submit_inspection_result()
 * Uses exact LIVE signature: (p_inspection_id, p_item_id, p_value, p_notes)
 */
export async function submitInspectionResultAction(input: SubmitInspectionResultInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!input.inspectionId || !input.itemId || !input.value) {
      return { success: false, error: 'Parameter inspeksi tidak lengkap.' };
    }

    const { data: resultId, error: rpcErr } = await supabase.rpc('submit_inspection_result', {
      p_inspection_id: input.inspectionId,
      p_item_id: input.itemId,
      p_value: input.value,
      p_notes: input.notes?.trim() || null,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Gagal menyimpan hasil checklist.' };
    }

    revalidatePath(`/inspections/${input.inspectionId}`);
    return { success: true, resultId: resultId as string };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan checklist.',
    };
  }
}

/**
 * Server Action: Add Inspection Photo Evidence
 * Calls authoritative database RPC: add_inspection_evidence() (Migration 034)
 */
export async function addInspectionEvidenceAction(input: AddInspectionEvidenceInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!input.inspectionId || !input.inspectionResultId || !input.fileUrl.trim()) {
      return { success: false, error: 'ID Inspeksi, ID Hasil Checklist, dan file URL wajib diisi.' };
    }

    const { data: evidenceId, error: rpcErr } = await supabase.rpc('add_inspection_evidence', {
      p_inspection_id: input.inspectionId,
      p_inspection_result_id: input.inspectionResultId,
      p_file_url: input.fileUrl.trim(),
      p_file_name: input.fileName || null,
      p_file_size: input.fileSize || null,
      p_mime_type: input.mimeType || null,
      p_caption: input.caption || null,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Gagal menyimpan metadata bukti foto.' };
    }

    revalidatePath(`/inspections/${input.inspectionId}`);
    return { success: true, evidenceId: evidenceId as string };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan bukti inspeksi.',
    };
  }
}

/**
 * Server Action: Complete Inspection
 * Calls authoritative database RPC: complete_inspection()
 * Returns overall_result derived strictly by the database (NG > OK > NA).
 */
export async function completeInspectionAction(inspectionId: string) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!inspectionId) {
      return { success: false, error: 'ID Inspeksi tidak valid.' };
    }

    const { data: overallResult, error: rpcErr } = await supabase.rpc('complete_inspection', {
      p_inspection_id: inspectionId,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Gagal menyelesaikan inspeksi.' };
    }

    revalidatePath('/inspections');
    revalidatePath(`/inspections/${inspectionId}`);
    revalidatePath('/assets');

    return { success: true, overallResult: overallResult as 'ok' | 'ng' | 'na' };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyelesaikan inspeksi.',
    };
  }
}

/**
 * Server Action: Cancel Inspection
 * Calls authoritative database RPC: cancel_inspection()
 */
export async function cancelInspectionAction(input: CancelInspectionInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!input.inspectionId || !input.reason.trim()) {
      return { success: false, error: 'Alasan pembatalan inspeksi wajib diisi.' };
    }

    const { error: rpcErr } = await supabase.rpc('cancel_inspection', {
      p_inspection_id: input.inspectionId,
      p_reason: input.reason.trim(),
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Gagal membatalkan inspeksi.' };
    }

    revalidatePath('/inspections');
    revalidatePath(`/inspections/${input.inspectionId}`);

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat membatalkan inspeksi.',
    };
  }
}

/**
 * Server Action: Create Global Inspection Template (Admin/Super Admin only)
 * Calls authoritative database RPC: create_inspection_template()
 * Uses exact LIVE signature with p_interval_days
 */
export async function createInspectionTemplateAction(input: CreateTemplateInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!input.name.trim()) {
      return { success: false, error: 'Nama Template wajib diisi.' };
    }

    const { data: templateId, error: rpcErr } = await supabase.rpc('create_inspection_template', {
      p_name: input.name.trim(),
      p_category_id: input.categoryId || null,
      p_description: input.description?.trim() || null,
      p_interval_days: input.inspectionIntervalDays ?? null,
      p_sections: input.sections || [],
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Gagal membuat template inspeksi.' };
    }

    revalidatePath('/inspections/templates');
    return { success: true, templateId: templateId as string };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat template.',
    };
  }
}

/**
 * Server Action: Deactivate Inspection Template (Admin/Super Admin only)
 * Calls authoritative database RPC: deactivate_inspection_template()
 */
export async function deactivateInspectionTemplateAction(templateId: string) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' };
    }

    if (!templateId) {
      return { success: false, error: 'ID Template tidak valid.' };
    }

    const { error: rpcErr } = await supabase.rpc('deactivate_inspection_template', {
      p_template_id: templateId,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Gagal menonaktifkan template.' };
    }

    revalidatePath('/inspections/templates');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat menonaktifkan template.',
    };
  }
}
