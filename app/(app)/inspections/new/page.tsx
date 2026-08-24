import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StartInspectionWizard } from '@/components/inspections/StartInspectionWizard';

export const metadata: Metadata = {
  title: 'Mulai Inspeksi QC Baru — WACT',
  description: 'Pilih aset dan template checklist QC untuk memulai sesi audit fisik.',
};

interface PageProps {
  searchParams: Promise<{ asset_id?: string; warehouse_id?: string }>;
}

export default async function NewInspectionPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const initialAssetId = resolvedParams.asset_id;

  // 1. Fetch user's active warehouses, active assets, templates, and active drafts concurrently
  const [userWarehousesRes, assetsRes, templatesRes, draftsRes] = await Promise.all([
    supabase
      .from('user_warehouses')
      .select('warehouses(id, code, name)')
      .eq('user_id', authData.user.id)
      .eq('is_active', true),
    supabase
      .from('assets')
      .select(`
        id,
        warehouse_id,
        asset_code,
        name,
        category_id,
        area_id,
        location_id,
        status,
        last_inspection_at,
        next_inspection_at,
        category:category_id(id, name),
        area:area_id(name),
        location:location_id(name)
      `)
      .neq('status', 'retired')
      .order('asset_code'),
    supabase
      .from('inspection_templates')
      .select(`
        id,
        name,
        category_id,
        description,
        inspection_interval_days,
        is_active,
        category:category_id(id, name),
        sections:inspection_template_sections(
          id,
          title,
          items:inspection_template_items(
            id,
            label,
            is_required
          )
        )
      `)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('inspections')
      .select('id, inspection_number, asset_id, started_at')
      .eq('status', 'draft'),
  ]);

  // Explicit error logging & user-friendly fallback (no silent failure hiding schema/embedding errors)
  if (assetsRes.error) {
    console.error('[NewInspectionPage] Failed to fetch assets:', assetsRes.error.message);
  }
  if (templatesRes.error) {
    console.error('[NewInspectionPage] Failed to fetch templates:', templatesRes.error.message);
  }
  if (userWarehousesRes.error) {
    console.error('[NewInspectionPage] Failed to fetch warehouses:', userWarehousesRes.error.message);
  }

  if (assetsRes.error || templatesRes.error || userWarehousesRes.error) {
    return (
      <div className="page-padding py-8 max-w-4xl mx-auto space-y-4">
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-slate-800 space-y-2">
          <h2 className="text-base font-extrabold text-rose-700">Gagal Memuat Data Inspeksi</h2>
          <p className="text-xs text-rose-600 font-medium">
            Terjadi kendala saat memuat master aset atau template checklist. Silakan muat ulang halaman atau hubungi Administrator.
          </p>
        </div>
      </div>
    );
  }

  const warehouses = (userWarehousesRes.data || [])
    .map((uw: any) => uw.warehouses)
    .filter(Boolean);

  return (
    <div className="page-padding py-4 sm:py-5 max-w-5xl mx-auto space-y-4">
      <StartInspectionWizard
        assets={(assetsRes.data || []) as any}
        templates={(templatesRes.data || []) as any}
        activeDrafts={(draftsRes.data || []) as any}
        initialAssetId={initialAssetId}
        warehouses={warehouses}
      />
    </div>
  );
}
