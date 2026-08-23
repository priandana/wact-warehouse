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

  // 1. Fetch user's active warehouses
  const { data: userWarehouses } = await supabase
    .from('user_warehouses')
    .select('warehouses(id, code, name)')
    .eq('user_id', authData.user.id)
    .eq('is_active', true);

  const warehouses = (userWarehouses || [])
    .map((uw: any) => uw.warehouses)
    .filter(Boolean);

  // 2. Fetch active assets
  const { data: assets } = await supabase
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
      category:asset_categories(id, name),
      area:areas(name),
      location:locations(name)
    `)
    .neq('status', 'retired')
    .order('asset_code');

  // 3. Fetch active inspection templates with sections & items
  const { data: templates } = await supabase
    .from('inspection_templates')
    .select(`
      id,
      name,
      category_id,
      description,
      inspection_interval_days,
      is_active,
      category:asset_categories(id, name),
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
    .order('name');

  // 4. Fetch existing active drafts to prevent collision and offer resume option
  const { data: activeDrafts } = await supabase
    .from('inspections')
    .select('id, inspection_number, asset_id, started_at')
    .eq('status', 'draft');

  return (
    <StartInspectionWizard
      assets={(assets || []) as any}
      templates={(templates || []) as any}
      activeDrafts={(activeDrafts || []) as any}
      initialAssetId={initialAssetId}
      warehouses={warehouses}
    />
  );
}
