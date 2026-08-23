import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InspectionListContainer, type InspectionListItem } from '@/components/inspections/InspectionListContainer';

export const metadata: Metadata = {
  title: 'QC & Inspeksi Rutin — WACT',
  description: 'Daftar sesi audit pemeriksaan fisik, operasional, dan keselamatan aset gudang.',
};

export default async function InspectionsPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect('/login');
  }

  const userId = authData.user.id;

  // 1. Fetch user's active warehouses & roles
  const { data: userWarehouses } = await supabase
    .from('user_warehouses')
    .select('warehouse_id, roles(name), warehouses(id, code, name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const isAdmin = userWarehouses?.some((uw: any) => uw.roles?.name === 'admin');
  const canManageTemplates = isSuperAdmin || Boolean(isAdmin);

  const warehouses = (userWarehouses || [])
    .map((uw: any) => uw.warehouses)
    .filter(Boolean);

  // 2. Fetch inspections list (RLS filters to user's permitted warehouses)
  const { data: inspections, error: inspErr } = await supabase
    .from('inspections')
    .select(`
      id,
      inspection_number,
      warehouse_id,
      asset_id,
      template_id,
      status,
      overall_result,
      notes,
      started_at,
      completed_at,
      created_at,
      inspector:profiles!inspections_inspector_id_fkey(id, full_name, avatar_url),
      asset:assets(
        id,
        asset_code,
        name,
        category:asset_categories(name),
        area:areas(name),
        location:locations(name)
      ),
      template:inspection_templates(
        id,
        name,
        category:asset_categories(name)
      ),
      warehouse:warehouses(id, code, name)
    `)
    .order('created_at', { ascending: false });

  if (inspErr) {
    console.error('Error loading inspections:', inspErr.message);
  }

  const formattedInspections: InspectionListItem[] = (inspections || []).map((insp: any) => ({
    id: insp.id,
    inspection_number: insp.inspection_number,
    warehouse_id: insp.warehouse_id,
    asset_id: insp.asset_id,
    template_id: insp.template_id,
    status: insp.status,
    overall_result: insp.overall_result,
    notes: insp.notes,
    cancellation_reason:
      insp.status === 'cancelled' && insp.notes?.includes('[CANCELLED]:')
        ? insp.notes.split('[CANCELLED]:')[1]?.trim() || insp.notes
        : null,
    started_at: insp.started_at,
    completed_at: insp.completed_at,
    created_at: insp.created_at,
    inspector: insp.inspector,
    asset: insp.asset,
    template: insp.template,
    warehouse: insp.warehouse,
  }));

  return (
    <InspectionListContainer
      initialInspections={formattedInspections}
      canManageTemplates={canManageTemplates}
      warehouses={warehouses}
    />
  );
}
