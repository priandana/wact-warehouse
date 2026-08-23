// scripts/verify_phase2c_step_a.mjs
// Authoritative Post-Execution Verification Suite for Migration 031
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | ${name}${detail ? ` — ${detail}` : ''}`);
}

async function runPostExecutionVerification() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔬 POST-EXECUTION VERIFICATION: MIGRATION 031 (LIVE SUPABASE)');
  console.log('Target:', supabaseUrl);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Authenticate test clients
  const qcClient = createClient(supabaseUrl, anonKey);
  await qcClient.auth.signInWithPassword({ email: 'qc.pdl@wact.test', password: 'Password123!' });

  const repClient = createClient(supabaseUrl, anonKey);
  await repClient.auth.signInWithPassword({ email: 'reporter.pdl@wact.test', password: 'Password123!' });

  const sysAdminClient = createClient(supabaseUrl, anonKey);
  await sysAdminClient.auth.signInWithPassword({ email: 'admin@wact.test', password: 'Password123!' });

  const anonClient = createClient(supabaseUrl, anonKey);

  // 1. Check Table: inspection_sequences (least privilege)
  console.log('--- 1. TABLE: inspection_sequences & LEAST PRIVILEGE ---');
  const { data: anonSeqSelect, error: anonSeqSelectErr } = await anonClient.from('inspection_sequences').select('*');
  const { data: authSeqSelect, error: authSeqSelectErr } = await qcClient.from('inspection_sequences').select('*');

  check('inspection_sequences direct SELECT denied for anon', anonSeqSelectErr != null || (anonSeqSelect && anonSeqSelect.length === 0), anonSeqSelectErr?.message || '0 rows');
  check('inspection_sequences direct SELECT denied for authenticated', authSeqSelectErr != null || (authSeqSelect && authSeqSelect.length === 0), authSeqSelectErr?.message || '0 rows');

  // 2. Check Column: inspection_templates.inspection_interval_days
  console.log('\n--- 2. COLUMN: inspection_templates.inspection_interval_days ---');
  const { data: tplData, error: tplErr } = await adminClient
    .from('inspection_templates')
    .select('id, name, inspection_interval_days')
    .limit(1);

  check('inspection_interval_days column added to inspection_templates', !tplErr, tplErr ? tplErr.message : 'Column verified selectable');

  // 3. Check All 6 RPCs in Migration 031 with Authenticated Role
  console.log('\n--- 3. RPC AVAILABILITY & FUNCTIONALITY GUARDS ---');
  const dummyUuid = '00000000-0000-0000-0000-000000000000';

  // 3.1 start_inspection (QC)
  const { error: eStart } = await qcClient.rpc('start_inspection', {
    p_warehouse_id: dummyUuid,
    p_asset_id: dummyUuid,
    p_template_id: dummyUuid,
  });
  check('RPC: start_inspection() installed & guarding warehouse scope', eStart && eStart.code === 'P0001' && eStart.message.includes('not in your active scope'), eStart?.message);

  // 3.2 submit_inspection_result (QC)
  const { error: eSubmit } = await qcClient.rpc('submit_inspection_result', {
    p_inspection_id: dummyUuid,
    p_item_id: dummyUuid,
    p_value: 'ok',
  });
  check('RPC: submit_inspection_result() installed & validating inspection', eSubmit && eSubmit.code === 'P0001' && eSubmit.message.includes('not found'), eSubmit?.message);

  // 3.3 complete_inspection (QC)
  const { error: eComplete } = await qcClient.rpc('complete_inspection', {
    p_inspection_id: dummyUuid,
  });
  check('RPC: complete_inspection() installed & validating inspection', eComplete && eComplete.code === 'P0001' && eComplete.message.includes('not found'), eComplete?.message);

  // 3.4 cancel_inspection (QC)
  const { error: eCancel } = await qcClient.rpc('cancel_inspection', {
    p_inspection_id: dummyUuid,
    p_reason: 'Post-execution test',
  });
  check('RPC: cancel_inspection() installed & validating inspection', eCancel && eCancel.code === 'P0001' && eCancel.message.includes('not found'), eCancel?.message);

  // 3.5 create_inspection_template (Admin vs Non-Admin)
  const { error: eTplAdmin } = await sysAdminClient.rpc('create_inspection_template', { p_name: '' });
  const { error: eTplQC } = await qcClient.rpc('create_inspection_template', { p_name: 'Test' });
  check('RPC: create_inspection_template() installed & allows Admin', eTplAdmin && eTplAdmin.code === 'P0001' && eTplAdmin.message.includes('Template name is required'), eTplAdmin?.message);
  check('RPC: create_inspection_template() blocks Non-Admin', eTplQC && eTplQC.code === 'P0001' && eTplQC.message.includes('Administrator or Super Admin authority required'), eTplQC?.message);

  // 3.6 deactivate_inspection_template (Admin vs Non-Admin)
  const { error: eDeactAdmin } = await sysAdminClient.rpc('deactivate_inspection_template', { p_template_id: dummyUuid });
  const { error: eDeactQC } = await qcClient.rpc('deactivate_inspection_template', { p_template_id: dummyUuid });
  check('RPC: deactivate_inspection_template() installed & allows Admin', eDeactAdmin && eDeactAdmin.code === 'P0001' && eDeactAdmin.message.includes('not found'), eDeactAdmin?.message);
  check('RPC: deactivate_inspection_template() blocks Non-Admin', eDeactQC && eDeactQC.code === 'P0001' && eDeactQC.message.includes('Administrator or Super Admin authority required'), eDeactQC?.message);

  // 4. Existing Production Data Integrity (Phase 2A & 2B)
  console.log('\n--- 4. PRODUCTION DATA INTEGRITY ---');
  const { count: casesCount } = await adminClient.from('cases').select('*', { count: 'exact', head: true });
  const { count: activitiesCount } = await adminClient.from('case_activities').select('*', { count: 'exact', head: true });
  const { count: assetsCount } = await adminClient.from('assets').select('*', { count: 'exact', head: true });
  const { count: inspectionsCount } = await adminClient.from('inspections').select('*', { count: 'exact', head: true });
  const { count: resultsCount } = await adminClient.from('inspection_results').select('*', { count: 'exact', head: true });
  const { count: tplsCount } = await adminClient.from('inspection_templates').select('*', { count: 'exact', head: true });

  check('Phase 2A Cases count intact', casesCount === 9, `Found: ${casesCount}, Expected: 9`);
  check('Phase 2A Case Activities count intact', activitiesCount === 69, `Found: ${activitiesCount}, Expected: 69`);
  check('Phase 2B Assets count intact (clean 0 rows)', assetsCount === 0, `Found: ${assetsCount}, Expected: 0`);
  check('Inspections table intact (clean 0 rows)', inspectionsCount === 0, `Found: ${inspectionsCount}, Expected: 0`);
  check('Inspection Results table intact (clean 0 rows)', resultsCount === 0, `Found: ${resultsCount}, Expected: 0`);
  check('Inspection Templates intact (clean 0 rows before 032)', tplsCount === 0, `Found: ${tplsCount}, Expected: 0`);

  // 5. Phase 2A Core RPCs Still Intact
  console.log('\n--- 5. PHASE 2A CORE RPCS REGRESSION CHECK ---');
  const { error: eCase } = await qcClient.rpc('create_case', {
    p_warehouse_id: dummyUuid,
    p_title: 'Test',
    p_client_request_id: dummyUuid,
  });
  check('Phase 2A RPC: create_case() intact & functioning', eCase && eCase.code === 'P0001' && eCase.message.includes('missing case.create capability'), eCase?.message);

  const { error: eAssign } = await qcClient.rpc('assign_case', {
    p_case_id: dummyUuid,
    p_assignee_id: dummyUuid,
  });
  check('Phase 2A RPC: assign_case() intact & functioning', eAssign && eAssign.code === 'P0001' && eAssign.message.includes('not found'), eAssign?.message);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Verdict: ${failed === 0 ? '✅ 100% PASS' : '❌ FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

runPostExecutionVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
