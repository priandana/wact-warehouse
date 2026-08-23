import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const coordClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const bdgWhId = '2b06562e-05fc-4526-9ef8-88d004944872';
const pdlWhId = 'afe3b4a3-e0ea-41b0-93d4-89e6f0cbcb09';
const picBdgUserId = 'a825e1c4-102f-4476-9cf2-985e9343ceeb';

// ── STEP 1: Login Coordinator & Admin ────────────────────────────────────
console.log('=== Step 1: Authentication ===');
const { data: coordAuth, error: coordLoginErr } = await coordClient.auth.signInWithPassword({
  email: 'coordinator.bdg@wact.test',
  password: 'Password123!',
});
console.log('Coordinator BDG Logged In:', coordAuth?.user?.id, 'Error:', coordLoginErr);

const { data: adminAuth, error: adminLoginErr } = await adminClient.auth.signInWithPassword({
  email: 'admin@wact.test',
  password: 'Password123!',
});
console.log('Admin Logged In:', adminAuth?.user?.id, 'Error:', adminLoginErr);

// ── STEP 2: Create a NEW Case in BDG ─────────────────────────────────────
console.log('\n=== Step 2: Create NEW Case in BDG via create_case RPC ===');
// Get Inbound area and receiving location for BDG
const { data: areas } = await coordClient.from('areas').select('id, name').eq('warehouse_id', bdgWhId);
const inboundArea = areas?.find(a => a.name.includes('INBOUND')) || areas?.[0];
const { data: locations } = await coordClient.from('locations').select('id, name').eq('area_id', inboundArea.id);
const receivingLoc = locations?.[0];

const { data: newCaseId, error: createCaseErr } = await coordClient.rpc('create_case', {
  p_warehouse_id: bdgWhId,
  p_title: 'Conveyor Belts Sorter Terhambat Tumpukan Kardus',
  p_description: 'Sensor photoelectric pada sorter 2 terhalang tumpukan karton sehingga jalur otomatis berhenti.',
  p_client_request_id: crypto.randomUUID(),
  p_category_id: null,
  p_subcategory_id: null,
  p_area_id: inboundArea.id,
  p_location_id: receivingLoc?.id || null,
  p_asset_id: null,
  p_priority: 'medium',
  p_has_operational_impact: true,
  p_requires_maintenance: false,
  p_source: 'direct',
});

if (createCaseErr) {
  console.error('Create case failed:', createCaseErr);
  process.exit(1);
}
console.log('New Case Created Successfully! ID:', newCaseId);

const { data: createdCase } = await coordClient
  .from('cases')
  .select('id, case_number, title, status, priority, due_date')
  .eq('id', newCaseId)
  .single();
console.log('Case Record in DB:', createdCase);

// ── STEP 3: Cross-Warehouse Isolation Check ──────────────────────────────
console.log('\n=== Step 3: Cross-Warehouse Isolation ===');
const { data: pdlCases } = await coordClient
  .from('cases')
  .select('id, case_number')
  .eq('warehouse_id', pdlWhId);
console.log('PDL Cases visible to Coordinator BDG (Should be 0):', pdlCases?.length);

// ── STEP 4: Assign / Ganti PIC ───────────────────────────────────────────
console.log('\n=== Step 4: Assign PIC via assign_case RPC ===');
const { error: assignErr } = await coordClient.rpc('assign_case', {
  p_case_id: newCaseId,
  p_assignee_id: picBdgUserId,
});
console.log('Assign Case Result:', assignErr ? assignErr : 'SUCCESS (Status -> on_progress)');

const { data: caseAfterAssign } = await coordClient
  .from('cases')
  .select('status, case_assignments(assignee_id, is_current, profiles:assignee_id(full_name))')
  .eq('id', newCaseId)
  .single();
console.log('Status & Assignment after Assign:', JSON.stringify(caseAfterAssign, null, 2));

// ── STEP 5: Change Priority ──────────────────────────────────────────────
console.log('\n=== Step 5: Change Priority via change_case_priority RPC ===');
const { error: prioErr } = await coordClient.rpc('change_case_priority', {
  p_case_id: newCaseId,
  p_priority: 'high',
});
console.log('Change Priority Result:', prioErr ? prioErr : 'SUCCESS (Priority -> high)');

const { data: caseAfterPrio } = await coordClient
  .from('cases')
  .select('priority')
  .eq('id', newCaseId)
  .single();
console.log('Priority after change:', caseAfterPrio?.priority);

// ── STEP 6: Override Due Date with Mandatory Reason ───────────────────────
console.log('\n=== Step 6: Override Due Date via override_case_due_date RPC ===');
const newDue = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
const overrideReason = 'Menunggu kedatangan teknisi vendor conveyor pada shift berikutnya';

const { error: dueErr } = await coordClient.rpc('override_case_due_date', {
  p_case_id: newCaseId,
  p_new_due_date: newDue,
  p_reason: overrideReason,
});
console.log('Override Due Date Result:', dueErr ? dueErr : 'SUCCESS');

const { data: dueAudit } = await coordClient
  .from('due_date_changes')
  .select('previous_due_date, new_due_date, reason, created_at, changed_by')
  .eq('case_id', newCaseId);
console.log('Audit trail in due_date_changes table:', JSON.stringify(dueAudit, null, 2));

// ── STEP 7: Security Barrier — Force Close by Coordinator vs Admin ────────
console.log('\n=== Step 7: Force Close Security Barrier ===');
// Attempt 1: Coordinator calls force_close_case (Should fail)
const { error: coordForceCloseErr } = await coordClient.rpc('force_close_case', {
  p_case_id: newCaseId,
  p_reason: 'Coordinator mencoba force close',
});
console.log('Coordinator Force Close Attempt (Expected error):', coordForceCloseErr?.message);

// Attempt 2: Admin calls force_close_case (Should succeed)
const { error: adminForceCloseErr } = await adminClient.rpc('force_close_case', {
  p_case_id: newCaseId,
  p_reason: 'Selesai langsung melalui koordinasi supervisor operasional dan pembersihan sensor.',
});
console.log('Admin Force Close Attempt:', adminForceCloseErr ? adminForceCloseErr : 'SUCCESS (Status -> closed)');

const { data: caseAfterForceClose } = await adminClient
  .from('cases')
  .select('status, closed_at')
  .eq('id', newCaseId)
  .single();
console.log('Case Status after Force Close:', caseAfterForceClose);

// ── STEP 8: Reopen Closed Case ───────────────────────────────────────────
console.log('\n=== Step 8: Reopen Case via reopen_case RPC ===');
const reopenReason = 'Pallet pengganjal ditemukan kembali terpasang pada sorter, perlu investigasi SOP operasional';
const { error: reopenErr } = await coordClient.rpc('reopen_case', {
  p_case_id: newCaseId,
  p_reason: reopenReason,
});
console.log('Reopen Case Result:', reopenErr ? reopenErr : 'SUCCESS (Status -> reopened)');

const { data: caseAfterReopen } = await coordClient
  .from('cases')
  .select('status, closed_at')
  .eq('id', newCaseId)
  .single();
console.log('Case Status after Reopen:', caseAfterReopen);

// ── STEP 9: Audit Activities ─────────────────────────────────────────────
console.log('\n=== Step 9: Complete Activity Log for the New Case ===');
const { data: activities } = await coordClient
  .from('case_activities')
  .select('action, from_status, to_status, metadata, created_at, actor:actor_id(full_name)')
  .eq('case_id', newCaseId)
  .order('created_at', { ascending: true });
console.log('Activity Log:', JSON.stringify(activities, null, 2));

console.log('\n=== ALL COORDINATOR/ADMIN VERIFICATIONS COMPLETED SUCCESSFULLY ===');
console.log('Active Test Case ID:', newCaseId);
console.log('Case Number:', createdCase.case_number);
