// app/(app)/assets/[id]/page.tsx
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { AssetDetailView } from '@/components/assets/AssetDetailView';
import { BUCKETS } from '@/lib/supabase/storage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: asset } = await supabase
    .from('assets')
    .select('asset_code, name')
    .eq('id', id)
    .maybeSingle();

  if (!asset) return { title: 'Aset Tidak Ditemukan — WACT' };
  return { title: `${asset.asset_code} - ${asset.name} — WACT` };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect(`/login?next=/assets/${id}`);
  }

  const userId = authData.user.id;

  // 1. Fetch asset with warehouse, category, area, location
  const { data: asset, error: assetErr } = await supabase
    .from('assets')
    .select(`
      id,
      warehouse_id,
      asset_code,
      name,
      category_id,
      area_id,
      location_id,
      photo_url,
      status,
      installed_date,
      qr_code_url,
      last_inspection_at,
      next_inspection_at,
      specification,
      created_at,
      updated_at,
      warehouse:warehouse_id(name, code),
      category:category_id(name),
      area:area_id(name),
      location:location_id(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (assetErr || !asset) {
    notFound();
  }

  // 2. Verify user has access to this warehouse
  const { data: userWarehouse } = await supabase
    .from('user_warehouses')
    .select('roles(name)')
    .eq('user_id', userId)
    .eq('warehouse_id', asset.warehouse_id)
    .eq('is_active', true)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  const isSuperAdmin = profile?.is_super_admin ?? false;
  if (!userWarehouse && !isSuperAdmin) {
    // Cross-warehouse isolation protection: user is not assigned to this warehouse
    notFound();
  }

  const roleName = (userWarehouse as any)?.roles?.name;
  const canManage = isSuperAdmin || roleName === 'admin' || roleName === 'coordinator';

  // 3. Generate signed URL for photo if present
  let photoSignedUrl: string | null = null;
  if (asset.photo_url) {
    try {
      const { data: signedData } = await supabase.storage
        .from(BUCKETS.ASSET_PHOTOS)
        .createSignedUrl(asset.photo_url, 3600);
      photoSignedUrl = signedData?.signedUrl || null;
    } catch {}
  }

  // 4. Fetch Cases for this asset
  const { data: casesData } = await supabase
    .from('cases')
    .select(`
      id,
      case_number,
      title,
      status,
      priority,
      created_at,
      reporter:reporter_id(full_name)
    `)
    .eq('asset_id', id)
    .order('created_at', { ascending: false });

  // 5. Fetch Inspections for this asset
  const { data: inspectionsData } = await supabase
    .from('inspections')
    .select(`
      id,
      created_at,
      inspector:inspector_id(full_name)
    `)
    .eq('asset_id', id)
    .order('created_at', { ascending: false });

  // 6. Fetch categories, areas, locations for edit modal
  const { data: categories } = await supabase
    .from('asset_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const { data: areas } = await supabase
    .from('areas')
    .select('id, name, warehouse_id')
    .eq('warehouse_id', asset.warehouse_id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, area_id')
    .eq('warehouse_id', asset.warehouse_id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-4">
      <AssetDetailView
        asset={{
          ...asset,
          photo_signed_url: photoSignedUrl,
        } as any}
        cases={(casesData || []) as any}
        inspections={(inspectionsData || []) as any}
        canManage={canManage}
        categories={categories || []}
        areas={areas || []}
        locations={locations || []}
      />
    </div>
  );
}
