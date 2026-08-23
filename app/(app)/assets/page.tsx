// app/(app)/assets/page.tsx
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AssetListContainer } from '@/components/assets/AssetListContainer';
import { AssetRecord } from '@/components/assets/AssetCard';

export const metadata: Metadata = { title: 'Aset & Mesin — WACT' };

export default async function AssetsPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect('/login');
  }

  const userId = authData.user.id;

  // 1. Fetch user active warehouse & role
  const { data: userWarehouses } = await supabase
    .from('user_warehouses')
    .select('warehouse_id, roles(name), warehouses(id, name, code)')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!userWarehouses || userWarehouses.length === 0) {
    return (
      <div className="page-padding py-8 max-w-5xl mx-auto text-center space-y-2">
        <h1 className="text-xl font-bold text-slate-900">Akses Gudang Tidak Ditemukan</h1>
        <p className="text-xs text-slate-500">Akun Anda belum memiliki akses gudang aktif. Hubungi Koordinator.</p>
      </div>
    );
  }

  const activeUW = userWarehouses[0] as any;
  const activeWarehouse = activeUW.warehouses as any;
  const warehouseId = activeWarehouse?.id;
  const warehouseName = activeWarehouse?.name || 'Gudang Utama';

  // Check role & capability
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const roleName = (activeUW.roles as any)?.name;
  const canManageAsset = isSuperAdmin || roleName === 'admin' || roleName === 'coordinator';

  // 2. Fetch assets for this warehouse
  const { data: assetsData } = await supabase
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
      last_inspection_at,
      next_inspection_at,
      specification,
      category:category_id(name),
      area:area_id(name),
      location:location_id(name)
    `)
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false });

  // 3. Fetch open cases count grouped by asset_id
  const { data: openCases } = await supabase
    .from('cases')
    .select('asset_id')
    .eq('warehouse_id', warehouseId)
    .in('status', ['open', 'on_progress', 'waiting_repair', 'waiting_verification', 'reopened']);

  const caseCountMap = new Map<string, number>();
  (openCases || []).forEach((c: any) => {
    if (c.asset_id) {
      caseCountMap.set(c.asset_id, (caseCountMap.get(c.asset_id) || 0) + 1);
    }
  });

  const formattedAssets: AssetRecord[] = (assetsData || []).map((ast: any) => ({
    ...ast,
    openCasesCount: caseCountMap.get(ast.id) || 0,
  }));

  // 4. Fetch categories, areas, locations for filter dropdowns
  const { data: categories } = await supabase
    .from('asset_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const { data: areas } = await supabase
    .from('areas')
    .select('id, name, warehouse_id')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, area_id')
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-4">
      <AssetListContainer
        initialAssets={formattedAssets}
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        categories={categories || []}
        areas={areas || []}
        locations={locations || []}
        canManageAsset={canManageAsset}
      />
    </div>
  );
}
