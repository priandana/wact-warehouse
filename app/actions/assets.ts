'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CreateAssetInput {
  warehouseId: string;
  assetCode: string;
  name: string;
  categoryId?: string | null;
  areaId?: string | null;
  locationId?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  condition?: 'good' | 'fair' | 'damaged' | 'critical';
  status?: 'active' | 'inactive' | 'maintenance' | 'retired';
  installedDate?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
}

export interface UpdateAssetInput {
  name: string;
  categoryId?: string | null;
  areaId?: string | null;
  locationId?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  condition?: 'good' | 'fair' | 'damaged' | 'critical';
  status?: 'active' | 'inactive' | 'maintenance' | 'retired';
  installedDate?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
}

/**
 * Server Action: Create New Asset (Guarded by Coordinator / Admin / asset.manage)
 */
export async function createAssetAction(input: CreateAssetInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const userId = authData.user.id;

    // Check user role & capability on target warehouse
    const { data: userWarehouse } = await supabase
      .from('user_warehouses')
      .select('roles(name)')
      .eq('user_id', userId)
      .eq('warehouse_id', input.warehouseId)
      .eq('is_active', true)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    const isSuperAdmin = profile?.is_super_admin ?? false;
    const roleName = (userWarehouse as any)?.roles?.name;
    const canManage = isSuperAdmin || roleName === 'admin' || roleName === 'coordinator';

    if (!canManage) {
      return { success: false, error: 'Permission denied: Anda tidak memiliki hak akses mengelola master aset.' };
    }

    if (!input.assetCode.trim() || !input.name.trim()) {
      return { success: false, error: 'Kode Aset dan Nama Aset wajib diisi.' };
    }

    const cleanCode = input.assetCode.trim().toUpperCase();
    const qrCode = `WACT-${cleanCode}`;

    const newAsset = {
      warehouse_id: input.warehouseId,
      asset_code: cleanCode,
      name: input.name.trim(),
      category_id: input.categoryId || null,
      area_id: input.areaId || null,
      location_id: input.locationId || null,
      photo_url: input.photoUrl || null,
      status: input.status || 'active',
      installed_date: input.installedDate || null,
      qr_code_url: qrCode,
      specification: {
        brand: input.brand?.trim() || null,
        model: input.model?.trim() || null,
        serial_number: input.serialNumber?.trim() || null,
        condition: input.condition || 'good',
        notes: input.notes?.trim() || null,
      },
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('assets')
      .insert(newAsset)
      .select('id, asset_code, name')
      .single();

    if (insertErr) {
      if (insertErr.message.includes('unique') || insertErr.code === '23505') {
        return { success: false, error: `Kode Aset "${cleanCode}" sudah terdaftar di gudang ini.` };
      }
      return { success: false, error: insertErr.message || 'Gagal menyimpan data aset.' };
    }

    revalidatePath('/assets');
    return { success: true, asset: inserted };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' };
  }
}

/**
 * Server Action: Update Existing Asset (Guarded by Coordinator / Admin / asset.manage)
 */
export async function updateAssetAction(assetId: string, input: UpdateAssetInput) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const userId = authData.user.id;

    // Fetch existing asset to check warehouse
    const { data: existingAsset, error: fetchErr } = await supabase
      .from('assets')
      .select('id, warehouse_id, asset_code, photo_url, specification')
      .eq('id', assetId)
      .single();

    if (fetchErr || !existingAsset) {
      return { success: false, error: 'Data aset tidak ditemukan.' };
    }

    // Check user capability on asset's warehouse
    const { data: userWarehouse } = await supabase
      .from('user_warehouses')
      .select('roles(name)')
      .eq('user_id', userId)
      .eq('warehouse_id', existingAsset.warehouse_id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    const isSuperAdmin = profile?.is_super_admin ?? false;
    const roleName = (userWarehouse as any)?.roles?.name;
    const canManage = isSuperAdmin || roleName === 'admin' || roleName === 'coordinator';

    if (!canManage) {
      return { success: false, error: 'Permission denied: Anda tidak memiliki hak akses mengubah master aset.' };
    }

    const currentSpec = (existingAsset.specification as Record<string, any>) || {};
    const updatedSpec = {
      ...currentSpec,
      brand: input.brand !== undefined ? input.brand?.trim() || null : currentSpec.brand,
      model: input.model !== undefined ? input.model?.trim() || null : currentSpec.model,
      serial_number: input.serialNumber !== undefined ? input.serialNumber?.trim() || null : currentSpec.serial_number,
      condition: input.condition || currentSpec.condition || 'good',
      notes: input.notes !== undefined ? input.notes?.trim() || null : currentSpec.notes,
    };

    const updatePayload: Record<string, any> = {
      name: input.name.trim(),
      category_id: input.categoryId || null,
      area_id: input.areaId || null,
      location_id: input.locationId || null,
      status: input.status || 'active',
      installed_date: input.installedDate || null,
      specification: updatedSpec,
      updated_at: new Date().toISOString(),
    };

    if (input.photoUrl) {
      updatePayload.photo_url = input.photoUrl;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('assets')
      .update(updatePayload as any)
      .eq('id', assetId)
      .select('id, asset_code, name')
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Gagal memperbarui data aset.' };
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${assetId}`);
    return { success: true, asset: updated };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.' };
  }
}

/**
 * Server Action: Delete or Retire Asset
 */
export async function deleteAssetAction(assetId: string) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const userId = authData.user.id;

    const { data: existingAsset } = await supabase
      .from('assets')
      .select('id, warehouse_id')
      .eq('id', assetId)
      .single();

    if (!existingAsset) return { success: false, error: 'Aset tidak ditemukan.' };

    const { data: userWarehouse } = await supabase
      .from('user_warehouses')
      .select('roles(name)')
      .eq('user_id', userId)
      .eq('warehouse_id', existingAsset.warehouse_id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    const isSuperAdmin = profile?.is_super_admin ?? false;
    const roleName = (userWarehouse as any)?.roles?.name;
    const canManage = isSuperAdmin || roleName === 'admin' || roleName === 'coordinator';

    if (!canManage) {
      return { success: false, error: 'Permission denied: Anda tidak memiliki hak akses menghapus aset.' };
    }

    // Check if asset has cases or inspections
    const { count: caseCount } = await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('asset_id', assetId);

    const { count: inspCount } = await supabase
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .eq('asset_id', assetId);

    if ((caseCount && caseCount > 0) || (inspCount && inspCount > 0)) {
      // Soft delete: set status to 'retired'
      await supabase
        .from('assets')
        .update({ status: 'retired', updated_at: new Date().toISOString() })
        .eq('id', assetId);
    } else {
      // Hard delete
      await supabase.from('assets').delete().eq('id', assetId);
    }

    revalidatePath('/assets');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus aset.' };
  }
}
