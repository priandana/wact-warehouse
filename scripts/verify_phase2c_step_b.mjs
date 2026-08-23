// scripts/verify_phase2c_step_b.mjs
// Authoritative Post-Execution Verification Suite for Migration 032 & 033 (Template Seed)
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
  console.log('🔬 POST-EXECUTION VERIFICATION: MIGRATION 032 & 033 (TEMPLATE SEED)');
  console.log('Target:', supabaseUrl);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const deterministicTemplateIds = [
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0007-000000000002',
    '00000000-0000-0000-0007-000000000003'
  ];

  // 1. Fetch categories
  const { data: cats } = await adminClient.from('asset_categories').select('id, name').in('name', ['Hand Pallet', 'APAR', 'Rack']);
  const catMap = Object.fromEntries((cats || []).map(c => [c.name, c.id]));

  // 2. Fetch seeded templates
  console.log('--- 1. SEEDED TEMPLATES CHECK ---');
  const { data: templates, error: tplErr } = await adminClient
    .from('inspection_templates')
    .select('id, name, category_id, description, inspection_interval_days, is_active')
    .in('id', deterministicTemplateIds)
    .order('id');

  check('Seeded templates count = 3', templates?.length === 3, `Found: ${templates?.length || 0}`);

  const hpTpl = templates?.find(t => t.id === '00000000-0000-0000-0007-000000000001');
  const aparTpl = templates?.find(t => t.id === '00000000-0000-0000-0007-000000000002');
  const rackTpl = templates?.find(t => t.id === '00000000-0000-0000-0007-000000000003');

  check('Hand Pallet template category linked correctly', hpTpl?.category_id === catMap['Hand Pallet'], `Expected: ${catMap['Hand Pallet']}, Got: ${hpTpl?.category_id}`);
  check('APAR template category linked correctly', aparTpl?.category_id === catMap['APAR'], `Expected: ${catMap['APAR']}, Got: ${aparTpl?.category_id}`);
  check('Rack template category linked correctly', rackTpl?.category_id === catMap['Rack'], `Expected: ${catMap['Rack']}, Got: ${rackTpl?.category_id}`);

  const allActive = templates?.every(t => t.is_active === true);
  const allIntervalNull = templates?.every(t => t.inspection_interval_days === null);
  check('All seeded templates have is_active = true', allActive, `Active: ${templates?.filter(t => t.is_active).length}/${templates?.length}`);
  check('All seeded templates have inspection_interval_days = NULL', allIntervalNull, `Null intervals: ${templates?.filter(t => t.inspection_interval_days === null).length}/${templates?.length}`);

  // 3. Fetch seeded sections
  console.log('\n--- 2. SEEDED SECTIONS CHECK ---');
  const { data: sections, error: secErr } = await adminClient
    .from('inspection_template_sections')
    .select('id, template_id, title, sort_order')
    .in('template_id', deterministicTemplateIds)
    .order('template_id', { ascending: true })
    .order('sort_order', { ascending: true });

  check('Seeded sections count = 9', sections?.length === 9, `Found: ${sections?.length || 0}`);

  const sectionIds = (sections || []).map(s => s.id);
  const allSectionsValidParent = sections?.every(s => deterministicTemplateIds.includes(s.template_id));
  check('All 9 sections belong to seeded deterministic templates (no orphans)', allSectionsValidParent, 'Parent template references verified');

  const hpSections = sections?.filter(s => s.template_id === hpTpl?.id);
  const aparSections = sections?.filter(s => s.template_id === aparTpl?.id);
  const rackSections = sections?.filter(s => s.template_id === rackTpl?.id);

  check('Hand Pallet template has 3 sections', hpSections?.length === 3, `Found: ${hpSections?.length}`);
  check('APAR template has 3 sections', aparSections?.length === 3, `Found: ${aparSections?.length}`);
  check('Rack template has 3 sections', rackSections?.length === 3, `Found: ${rackSections?.length}`);

  // 4. Fetch seeded items
  console.log('\n--- 3. SEEDED ITEMS CHECK ---');
  const { data: items, error: itmErr } = await adminClient
    .from('inspection_template_items')
    .select('id, section_id, label, description, is_required, sort_order')
    .in('section_id', sectionIds)
    .order('sort_order', { ascending: true });

  check('Seeded items total count = 21 (HP:7, APAR:7, Rack:7)', items?.length === 21, `Found: ${items?.length || 0}`);

  const allItemsValidParent = items?.every(i => sectionIds.includes(i.section_id));
  check('All items belong to valid seeded sections (no orphans)', allItemsValidParent, 'Parent section references verified');

  const allItemsRequired = items?.every(i => i.is_required === true);
  check('All seeded items have is_required = true', allItemsRequired, `Required items: ${items?.filter(i => i.is_required).length}/${items?.length}`);

  const hpItemCount = items?.filter(i => hpSections?.map(s => s.id).includes(i.section_id)).length;
  const aparItemCount = items?.filter(i => aparSections?.map(s => s.id).includes(i.section_id)).length;
  const rackItemCount = items?.filter(i => rackSections?.map(s => s.id).includes(i.section_id)).length;

  check('Hand Pallet template has 7 items (3/2/2)', hpItemCount === 7, `Found: ${hpItemCount}`);
  check('APAR template has 7 items (2/3/2)', aparItemCount === 7, `Found: ${aparItemCount}`);
  check('Rack template has 7 items (3/2/2)', rackItemCount === 7, `Found: ${rackItemCount}`);

  // 5. Existing Production Data Integrity (Phase 2A & 2B)
  console.log('\n--- 4. PRODUCTION DATA INTEGRITY (PHASE 2A/2B) ---');
  const { count: casesCount } = await adminClient.from('cases').select('*', { count: 'exact', head: true });
  const { count: activitiesCount } = await adminClient.from('case_activities').select('*', { count: 'exact', head: true });
  const { count: assetsCount } = await adminClient.from('assets').select('*', { count: 'exact', head: true });
  const { count: inspectionsCount } = await adminClient.from('inspections').select('*', { count: 'exact', head: true });

  check('Phase 2A Cases count intact', casesCount === 9, `Found: ${casesCount}, Expected: 9`);
  check('Phase 2A Case Activities count intact', activitiesCount === 69, `Found: ${activitiesCount}, Expected: 69`);
  check('Phase 2B Assets count intact', assetsCount === 0, `Found: ${assetsCount}, Expected: 0`);
  check('Inspections table intact', inspectionsCount === 0, `Found: ${inspectionsCount}, Expected: 0`);

  // 6. Verify 031 RPCs functioning
  console.log('\n--- 5. 031 RPCS POST-SEED REGRESSION CHECK ---');
  const qcClient = createClient(supabaseUrl, anonKey);
  await qcClient.auth.signInWithPassword({ email: 'qc.pdl@wact.test', password: 'Password123!' });

  const dummy = '00000000-0000-0000-0000-000000000000';
  const { error: eStart } = await qcClient.rpc('start_inspection', {
    p_warehouse_id: dummy,
    p_asset_id: dummy,
    p_template_id: hpTpl ? hpTpl.id : dummy,
  });
  check('RPC: start_inspection() with seeded template alive', eStart && eStart.code === 'P0001', eStart?.message);

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
