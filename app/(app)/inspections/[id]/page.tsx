import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { InspectionChecklistView, type InspectionData, type ChecklistSection } from '@/components/inspections/InspectionChecklistView';
import { InspectionDetailRecord } from '@/components/inspections/InspectionDetailRecord';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('inspections')
    .select('inspection_number')
    .eq('id', resolvedParams.id)
    .maybeSingle();

  return {
    title: data ? `Inspeksi ${data.inspection_number} — WACT` : 'Detail Inspeksi QC',
  };
}

export default async function InspectionDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const inspectionId = resolvedParams.id;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect('/login');
  }

  // 1. Fetch inspection details with explicit FK relationship constraints
  const { data: inspection, error: fetchErr } = await supabase
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
      inspector:profiles!inspections_inspector_id_fkey(id, full_name),
      asset:assets!inspections_asset_fk(
        id,
        asset_code,
        name,
        area_id,
        location_id,
        category:category_id(name),
        area:area_id(name),
        location:location_id(name)
      ),
      template:inspection_templates(
        id,
        name,
        category:category_id(name)
      ),
      warehouse:warehouses(id, code, name)
    `)
    .eq('id', inspectionId)
    .maybeSingle();

  // Distinguish between query failure and non-existent inspection
  if (fetchErr) {
    console.error(`[InspectionDetailPage] Error fetching inspection ${inspectionId}:`, fetchErr.message);
    return (
      <div className="page-padding py-8 max-w-4xl mx-auto space-y-4">
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-slate-800 space-y-2">
          <h2 className="text-base font-extrabold text-rose-700">Gagal Memuat Detail Inspeksi</h2>
          <p className="text-xs text-rose-600 font-medium">
            Terjadi kendala saat mengambil data sesi inspeksi. Silakan muat ulang halaman atau hubungi Administrator.
          </p>
        </div>
      </div>
    );
  }

  if (!inspection) {
    notFound();
  }

  // 2. Fetch template sections and items ordered by sort_order
  const { data: sectionsData, error: secErr } = await supabase
    .from('inspection_template_sections')
    .select(`
      id,
      template_id,
      title,
      sort_order,
      items:inspection_template_items(
        id,
        section_id,
        label,
        description,
        is_required,
        sort_order
      )
    `)
    .eq('template_id', inspection.template_id || '')
    .order('sort_order', { ascending: true });

  if (secErr) {
    console.error(`[InspectionDetailPage] Error fetching template sections for template ${inspection.template_id}:`, secErr.message);
  }

  // Sort items within sections
  const formattedSections: ChecklistSection[] = (sectionsData || []).map((sec: any) => ({
    id: sec.id,
    template_id: sec.template_id,
    title: sec.title,
    sort_order: sec.sort_order,
    items: (sec.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  // 3. Fetch existing results
  const { data: resultsData } = await supabase
    .from('inspection_results')
    .select('id, inspection_id, item_id, value, notes, created_at')
    .eq('inspection_id', inspectionId);

  // 4. Fetch inspection evidences
  const { data: evidencesData } = await supabase
    .from('inspection_evidences')
    .select('id, inspection_id, inspection_result_id, file_url, file_name, file_size, mime_type, caption, uploaded_at')
    .eq('inspection_id', inspectionId);

  const cancellationReason = inspection.status === 'cancelled' && inspection.notes?.includes('[CANCELLED]:')
    ? inspection.notes.split('[CANCELLED]:')[1]?.trim() || inspection.notes
    : null;

  const rawAsset = inspection.asset as any;
  const formattedAsset = rawAsset
    ? {
        id: rawAsset.id,
        asset_code: rawAsset.asset_code,
        name: rawAsset.name,
        area_id: rawAsset.area_id || null,
        location_id: rawAsset.location_id || null,
        category: Array.isArray(rawAsset.category) ? rawAsset.category[0] : rawAsset.category,
        area: Array.isArray(rawAsset.area) ? rawAsset.area[0] : rawAsset.area,
        location: Array.isArray(rawAsset.location) ? rawAsset.location[0] : rawAsset.location,
      }
    : null;

  const fullInspectionData: InspectionData = {
    id: inspection.id,
    inspection_number: inspection.inspection_number,
    warehouse_id: inspection.warehouse_id,
    asset_id: inspection.asset_id,
    template_id: inspection.template_id || '',
    status: inspection.status,
    overall_result: inspection.overall_result,
    notes: inspection.notes,
    cancellation_reason: cancellationReason,
    started_at: inspection.started_at || inspection.created_at,
    completed_at: inspection.completed_at,
    created_at: inspection.created_at,
    inspector: inspection.inspector as any,
    asset: formattedAsset,
    template: inspection.template as any,
    warehouse: inspection.warehouse as any,
    sections: formattedSections,
    initialResults: (resultsData || []).map((r: any) => ({
      id: r.id,
      inspection_id: r.inspection_id,
      item_id: r.item_id,
      value: r.value,
      notes: r.notes,
    })),
    initialEvidences: (evidencesData || []).map((e: any) => ({
      id: e.id,
      inspection_id: e.inspection_id,
      inspection_result_id: e.inspection_result_id,
      file_url: e.file_url,
      file_name: e.file_name,
      file_size: e.file_size,
      mime_type: e.mime_type,
      caption: e.caption,
      uploaded_at: e.uploaded_at,
    })),
  };

  // 5. Fetch any existing case created from this inspection (duplicate detection)
  const { data: linkedCases } = await supabase
    .from('cases')
    .select('id, case_number, title, status, created_at')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false })
    .limit(1);

  const linkedCase = linkedCases && linkedCases.length > 0 ? linkedCases[0] : null;

  if (inspection.status === 'draft') {
    return <InspectionChecklistView inspection={fullInspectionData} />;
  }

  return <InspectionDetailRecord inspection={fullInspectionData} linkedCase={linkedCase} />;
}
