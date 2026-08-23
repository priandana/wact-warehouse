// app/(app)/cases/new/page.tsx
// New Case Page — Server Component loading active master data

import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreateCaseWizard } from '@/components/cases/CreateCaseWizard';

export const metadata: Metadata = {
  title: 'Laporkan Kasus Baru',
  description: 'Formulir pelaporan kasus dan insiden operasional gudang',
};

export const dynamic = 'force-dynamic';

export default async function NewCasePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all active master data in parallel
  const [
    { data: categories },
    { data: subcategories },
    { data: areas },
    { data: locations },
    { data: assets },
  ] = await Promise.all([
    supabase
      .from('case_categories')
      .select('id, name, icon, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('case_subcategories')
      .select('id, category_id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('areas')
      .select('id, warehouse_id, code, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('locations')
      .select('id, area_id, warehouse_id, code, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('assets')
      .select('id, warehouse_id, area_id, asset_code, name')
      .neq('status', 'retired')
      .order('name', { ascending: true }),
  ]);

  return (
    <div className="page-padding py-4">
      <CreateCaseWizard
        categories={categories ?? []}
        subcategories={subcategories ?? []}
        areas={areas ?? []}
        locations={locations ?? []}
        assets={assets ?? []}
      />
    </div>
  );
}
