import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  TemplateManagementView,
  type TemplateDetailItem,
  type CategoryItem,
} from '@/components/inspections/TemplateManagementView';

export const metadata: Metadata = {
  title: 'Master Template Checklist QC — WACT',
  description: 'Kelola template inspeksi standar, bagian audit, dan poin pemeriksaan.',
};

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect('/login');
  }

  const userId = authData.user.id;

  // 1. Check user authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  const { data: userWarehouses } = await supabase
    .from('user_warehouses')
    .select('roles(name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const isAdmin = userWarehouses?.some((uw: any) => uw.roles?.name === 'admin');
  const canManage = isSuperAdmin || Boolean(isAdmin);

  // 2. Fetch categories
  const { data: categories } = await supabase
    .from('asset_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  // 3. Fetch active templates with sections & items
  const { data: templatesData } = await supabase
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
        sort_order,
        items:inspection_template_items(
          id,
          label,
          description,
          is_required,
          sort_order
        )
      )
    `)
    .eq('is_active', true)
    .order('name');

  const formattedTemplates: TemplateDetailItem[] = (templatesData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    category_id: t.category_id,
    description: t.description,
    inspection_interval_days: t.inspection_interval_days,
    is_active: t.is_active,
    category: t.category,
    sections: (t.sections || [])
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        sort_order: s.sort_order,
        items: (s.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }))
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  return (
    <TemplateManagementView
      templates={formattedTemplates}
      categories={(categories || []) as CategoryItem[]}
      canManage={canManage}
    />
  );
}
