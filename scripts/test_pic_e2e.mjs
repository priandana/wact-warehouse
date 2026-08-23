import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 1. Sign in as PIC Maintenance BDG
const { data: authData, error: loginErr } = await anonClient.auth.signInWithPassword({
  email: 'pic.bdg@wact.test',
  password: 'Password123!',
});

console.log('=== Step 1: Login PIC Maintenance BDG ===');
console.log('User ID:', authData?.user?.id);
console.log('Login Error:', loginErr);

// 2. Fetch active warehouse access
const { data: userWarehouses } = await anonClient
  .from('user_warehouses')
  .select('warehouse_id, is_active, warehouses(code, name), roles(name, display_name)')
  .eq('user_id', authData.user.id);

console.log('=== Step 2: Active Warehouses for PIC ===');
console.log(JSON.stringify(userWarehouses, null, 2));

// 3. Query My Tasks
const { data: userAssignments } = await anonClient
  .from('case_assignments')
  .select('case_id, is_current')
  .eq('assignee_id', authData.user.id)
  .eq('is_current', true);

const assignedCaseIds = (userAssignments ?? []).map((a) => a.case_id);
console.log('=== Step 3: Assigned Case IDs ===', assignedCaseIds);

const { data: rawCases, error: casesErr } = await anonClient
  .from('cases')
  .select(`
    id,
    case_number,
    title,
    description,
    priority,
    status,
    due_date,
    created_at,
    has_operational_impact,
    requires_maintenance,
    areas:area_id ( name ),
    locations:location_id ( name ),
    assets:asset_id ( asset_code, name ),
    reporter:reporter_id ( full_name )
  `)
  .in('id', assignedCaseIds);

console.log('=== Step 4: Cases returned for My Tasks ===');
console.log('Count:', rawCases?.length);
console.log('Cases:', JSON.stringify(rawCases, null, 2));
console.log('Cases Error:', casesErr);
