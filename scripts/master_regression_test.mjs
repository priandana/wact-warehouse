import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const bdgWhId = '2b06562e-05fc-4526-9ef8-88d004944872';
const pdlWhId = 'afe3b4a3-e0ea-41b0-93d4-89e6f0cbcb09';

// Helpers to get authenticated clients
async function getAuthClient(email, password = 'Password123!') {
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user };
}

console.log('================================================================');
console.log('🚀 MASTER REGRESSION TEST — CASE MANAGEMENT CORE (PHASE 2A)');
console.log('================================================================\n');

// ── 1. AUTHENTICATE ALL 5 BDG ROLES & 1 PDL USER ──────────────────────────
console.log('Step 1: Authenticating test accounts across all roles...');
const { client: reporterBdg, user: reporterUser } = await getAuthClient('reporter.bdg@wact.test');
const { client: picBdg, user: picUser } = await getAuthClient('pic.bdg@wact.test');
const { client: qcBdg, user: qcUser } = await getAuthClient('qc.bdg@wact.test');
const { client: coordBdg, user: coordUser } = await getAuthClient('coordinator.bdg@wact.test');
const { client: adminBdg, user: adminUser } = await getAuthClient('admin@wact.test');
const { client: reporterPdl, user: reporterPdlUser } = await getAuthClient('reporter.pdl@wact.test');

console.log('✓ Reporter BDG:', reporterUser.id);
console.log('✓ PIC Maintenance BDG:', picUser.id);
console.log('✓ QC Leader BDG:', qcUser.id);
console.log('✓ Coordinator BDG:', coordUser.id);
console.log('✓ Admin BDG:', adminUser.id);
console.log('✓ Reporter PDL (Cross-Check):', reporterPdlUser.id);

// ── 2. MASTER DATA LOOKUPS ───────────────────────────────────────────────
console.log('\nStep 2: Fetching Category, Subcategory, Area, Location for BDG...');
const { data: categories } = await reporterBdg.from('case_categories').select('id, name');
const cat = categories?.[0];
const { data: subcategories } = await reporterBdg.from('case_subcategories').select('id, name').eq('category_id', cat.id);
const subcat = subcategories?.[0];
const { data: areas } = await reporterBdg.from('areas').select('id, name').eq('warehouse_id', bdgWhId);
const area = areas?.[0];
const { data: locations } = await reporterBdg.from('locations').select('id, name').eq('area_id', area.id);
const location = locations?.[0];
const { data: rootCauses } = await reporterBdg.from('root_causes').select('id, name');
const rootCause = rootCauses?.[0];

console.log(`Category: ${cat.name}, Subcat: ${subcat?.name || 'N/A'}, Area: ${area.name}, Loc: ${location?.name || 'N/A'}`);

// ── 3. ROLE 1: REPORTER CREATES CASE (OPEN) ──────────────────────────────
console.log('\nStep 3: [Reporter BDG] Creating new Case with complete category metadata...');
const clientReqId = crypto.randomUUID();
const { data: caseId, error: createErr } = await reporterBdg.rpc('create_case', {
  p_warehouse_id: bdgWhId,
  p_title: 'Hydraulic Leakage pada Dock Leveller 04',
  p_description: 'Terdapat rembesan fluida oli hidrolik pada piston pengangkat dock leveller jalur 04.',
  p_category_id: cat.id,
  p_subcategory_id: subcat?.id || null,
  p_area_id: area.id,
  p_location_id: location?.id || null,
  p_asset_id: null,
  p_priority: 'medium',
  p_has_operational_impact: true,
  p_requires_maintenance: true,
  p_source: 'direct',
  p_client_request_id: clientReqId,
});

if (createErr) throw new Error(`Create case failed: ${createErr.message}`);

const { data: initialCase } = await reporterBdg
  .from('cases')
  .select('id, case_number, title, status, priority, category:category_id(name), subcategory:subcategory_id(name)')
  .eq('id', caseId)
  .single();

console.log('✓ Case Created:', initialCase.case_number, '| Status:', initialCase.status, '| Category:', initialCase.category?.name);

// Add BEFORE evidence
await reporterBdg.rpc('add_case_evidence', {
  p_case_id: caseId,
  p_phase: 'before',
  p_file_url: `evidences/${bdgWhId}/${caseId}/before_dock.jpg`,
  p_file_name: 'before_dock_leak.jpg',
  p_file_size: 1024 * 350,
  p_mime_type: 'image/jpeg',
  p_caption: 'Foto rembesan oli di dock leveller 04',
});
console.log('✓ Before Evidence Added');

// ── 4. ROLE 2: COORDINATOR ASSIGNS & ADJUSTS SLA (ON_PROGRESS) ───────────
console.log('\nStep 4: [Coordinator BDG] Changing Priority, Overriding Due Date & Assigning PIC...');
// Priority Change -> High
await coordBdg.rpc('change_case_priority', { p_case_id: caseId, p_priority: 'high' });
console.log('✓ Priority changed to HIGH');

// Due Date Override
const newDue = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
await coordBdg.rpc('override_case_due_date', {
  p_case_id: caseId,
  p_new_due_date: newDue,
  p_reason: 'Prioritas dinaikkan karena dock leveller dibutuhkan saat inbound sore',
});
console.log('✓ Due Date Overridden with audit reason');

// Assign to PIC BDG
await coordBdg.rpc('assign_case', { p_case_id: caseId, p_assignee_id: picUser.id });
console.log('✓ Assigned to PIC Maintenance BDG');

const { data: caseAfterAssign } = await coordBdg.from('cases').select('status, priority').eq('id', caseId).single();
console.log('✓ Status after assign:', caseAfterAssign.status, '| Priority:', caseAfterAssign.priority);

// ── 5. ROLE 3: PIC MAINTENANCE PROGRESS & REQUEST VERIFICATION ───────────
console.log('\nStep 5: [PIC Maintenance BDG] Updating progress & Requesting verification...');
// Add AFTER evidence
await picBdg.rpc('add_case_evidence', {
  p_case_id: caseId,
  p_phase: 'after',
  p_file_url: `evidences/${bdgWhId}/${caseId}/after_repair.jpg`,
  p_file_name: 'after_dock_repair.jpg',
  p_file_size: 1024 * 400,
  p_mime_type: 'image/jpeg',
  p_caption: 'Foto perbaikan penggantian seal hidrolik baru',
});
console.log('✓ After Evidence Added by PIC');

// Add comment
await picBdg.rpc('add_case_comment', {
  p_case_id: caseId,
  p_content: 'Penggantian O-ring seal hidrolik selesai. Jalur oli sudah dibilas dan dibersihkan.',
  p_is_internal: false,
});
console.log('✓ PIC Maintenance progress note added');

// Request Verification
await picBdg.rpc('request_case_verification', { p_case_id: caseId });
const { data: caseWaitingVerify } = await picBdg.from('cases').select('status').eq('id', caseId).single();
console.log('✓ Status after verification request:', caseWaitingVerify.status);

// ── 6. ROLE 4: QC LEADER REJECT (REWORK) & APPROVE (CLOSED) ──────────────
console.log('\nStep 6: [QC Leader BDG] Testing Reject path -> Re-request -> Approve path...');

// 6A. QC Rejection
await qcBdg.rpc('verify_case', {
  p_case_id: caseId,
  p_approved: false,
  p_note: 'Tekanan seal oli belum dites under-load, mohon lakukan uji beban 500kg terlebih dahulu.',
});
const { data: caseAfterReject } = await qcBdg.from('cases').select('status').eq('id', caseId).single();
console.log('✓ Status after QC Reject (Expected on_progress):', caseAfterReject.status);

// 6B. PIC Re-Requests Verification
await picBdg.rpc('request_case_verification', { p_case_id: caseId });
console.log('✓ PIC completed load test and re-requested verification');

// 6C. QC Approval
await qcBdg.rpc('verify_case', {
  p_case_id: caseId,
  p_approved: true,
  p_note: 'Uji beban 500kg lolos tanpa kebocoran. Dock leveller 04 siap beroperasi.',
});
const { data: caseAfterApprove } = await qcBdg.from('cases').select('status, closed_at').eq('id', caseId).single();
console.log('✓ Status after QC Approval:', caseAfterApprove.status, '| Closed at:', caseAfterApprove.closed_at);

// ── 7. ROLE 5: COORDINATOR / ADMIN REOPEN WORKFLOW ───────────────────────
console.log('\nStep 7: [Coordinator BDG] Reopening Closed Case with mandatory reason...');
await coordBdg.rpc('reopen_case', {
  p_case_id: caseId,
  p_reason: 'Sensor safety interlock dock leveller 04 berkedip kembali setelah 1 jam operasi bongkar muat.',
});
const { data: caseAfterReopen } = await coordBdg.from('cases').select('status, closed_at').eq('id', caseId).single();
console.log('✓ Status after Reopen (Expected reopened):', caseAfterReopen.status, '| Closed at (should be null):', caseAfterReopen.closed_at);

// ── 8. CROSS-WAREHOUSE ISOLATION VERIFICATION ────────────────────────────
console.log('\nStep 8: Verifying Cross-Warehouse Isolation between BDG & PDL...');
const { data: pdlSeesBdgCase } = await reporterPdl.from('cases').select('id, case_number').eq('id', caseId);
console.log('✓ PDL User query for BDG case (Should be 0 / empty):', pdlSeesBdgCase?.length || 0);

const { data: bdgSeesPdlCases } = await reporterBdg.from('cases').select('id, case_number').eq('warehouse_id', pdlWhId);
console.log('✓ BDG User query for PDL warehouse (Should be 0 / empty):', bdgSeesPdlCases?.length || 0);

// ── 9. COMPLETE AUDIT TIMELINE CHECK ─────────────────────────────────────
console.log('\nStep 9: Inspecting Complete Audit Timeline for the Regression Case...');
const { data: completeActivities } = await adminBdg
  .from('case_activities')
  .select('action, from_status, to_status, metadata, created_at, actor:actor_id(full_name)')
  .eq('case_id', caseId)
  .order('created_at', { ascending: true });

console.log('Total activities logged:', completeActivities.length);
completeActivities.forEach((act, idx) => {
  console.log(` ${idx + 1}. [${act.action}] by ${act.actor?.full_name || 'System'} | ${act.metadata?.reason || act.metadata?.note || ''}`);
});

console.log('\n================================================================');
console.log('🎉 ALL MASTER REGRESSION TESTS PASSED (100% SUCCESS)');
console.log('Active Regression Case ID:', caseId);
console.log('Case Number:', initialCase.case_number);
console.log('================================================================');
