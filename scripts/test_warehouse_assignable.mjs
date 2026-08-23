import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const caseId = 'af4fa63f-2423-4655-af0c-d65a90ac9f44';
const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: caseItem } = await adminClient.from('cases').select('id, case_number, warehouse_id').eq('id', caseId).single();
console.log('Case:', caseItem);

// Query user_warehouses specifically for this case's warehouse
const { data: warehouseStaff, error: staffErr } = await adminClient
  .from('user_warehouses')
  .select(`
    user_id,
    warehouse_id,
    roles ( id, name, display_name ),
    profiles:user_id ( id, full_name, avatar_url, is_active )
  `)
  .eq('warehouse_id', caseItem.warehouse_id)
  .eq('is_active', true);

console.log('Warehouse Staff query:', {
  count: warehouseStaff?.length,
  staff: warehouseStaff,
  error: staffErr
});

const candidates = (warehouseStaff ?? [])
  .filter((uw) => uw.profiles?.is_active)
  .map((uw) => ({
    id: uw.profiles.id,
    full_name: uw.profiles.full_name,
    avatar_url: uw.profiles.avatar_url,
    role_name: uw.roles?.name,
    role_display_name: uw.roles?.display_name || uw.roles?.name || 'Staff',
  }))
  .sort((a, b) => {
    const scoreA = a.role_name === 'pic_maintenance' ? 0 : a.role_name === 'coordinator' ? 1 : a.role_name === 'admin' ? 2 : 3;
    const scoreB = b.role_name === 'pic_maintenance' ? 0 : b.role_name === 'coordinator' ? 1 : b.role_name === 'admin' ? 2 : 3;
    return scoreA - scoreB;
  });

console.log('Filtered BDG Candidates:', candidates);
