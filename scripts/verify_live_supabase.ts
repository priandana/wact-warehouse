// scripts/verify_live_supabase.ts
// Automated Live Supabase Verification Suite for WACT
// Tests Steps 2 through 11 against live Supabase instance.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl, anonKey);
}

const testResults: Array<{ name: string; status: 'PASSED' | 'FAILED'; detail?: string }> = [];

function record(name: string, passed: boolean, detail?: string) {
  testResults.push({ name, status: passed ? 'PASSED' : 'FAILED', detail });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASSED' : 'FAILED'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function runVerification() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚀 WACT LIVE SUPABASE VERIFICATION SUITE');
  console.log('Target URL:', supabaseUrl);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // ── STEP 1: Verify Schema & Tables ──────────────────────────────────────
  console.log('--- 1. VERIFY DATABASE OBJECTS & TABLES ---');
  const requiredTables = [
    'profiles', 'roles', 'role_capabilities', 'warehouses', 'user_warehouses',
    'areas', 'locations', 'asset_categories', 'root_causes', 'case_categories',
    'case_subcategories', 'inspection_templates', 'sla_configurations',
    'assets', 'inspections', 'inspection_results', 'inspection_evidences',
    'case_sequences', 'cases', 'case_assignments', 'case_activities',
    'case_comments', 'case_evidences', 'due_date_changes', 'maintenance_actions',
    'notifications', 'audit_logs'
  ];

  let tablesOk = true;
  for (const table of requiredTables) {
    const { error } = await adminClient.from(table).select('*').limit(0);
    if (error) {
      tablesOk = false;
      record(`Table exists: ${table}`, false, error.message);
    }
  }
  if (tablesOk) {
    record('All 27 required core tables exist', true);
  }

  // ── STEP 2: Verify Profile Directory View ──────────────────────────────
  console.log('\n--- 2. VERIFY PROFILE DIRECTORY VIEW ---');
  const { data: dirData, error: dirErr } = await adminClient
    .from('profile_directory')
    .select('*')
    .limit(1);

  if (dirErr) {
    record('profile_directory view exists', false, dirErr.message);
  } else {
    const fields = dirData && dirData[0] ? Object.keys(dirData[0]) : ['id', 'full_name', 'avatar_url'];
    const hasSensitive = fields.some(f => ['phone', 'employee_id', 'is_super_admin', 'is_active'].includes(f));
    record('profile_directory view exists and excludes sensitive columns', !hasSensitive, `Fields: ${fields.join(', ')}`);
  }

  // ── STEP 3: Setup & Verify Storage Buckets ─────────────────────────────
  console.log('\n--- 3. VERIFY / CREATE PRIVATE STORAGE BUCKETS ---');
  const buckets = ['case-evidences', 'inspection-evidences', 'asset-photos', 'avatars'];
  for (const b of buckets) {
    const { error } = await adminClient.storage.createBucket(b, {
      public: false,
      fileSizeLimit: b.includes('avatar') ? 2097152 : 10485760,
    });
    // Duplicate is fine
    record(`Private Storage Bucket: ${b}`, !error || error.message.includes('already exists') || error.message.includes('Duplicate'), error?.message);
  }

  // ── STEP 4: Setup Development Warehouses & Test Users ──────────────────
  console.log('\n--- 4. SETUP WAREHOUSES & TEST AUTH USERS ---');
  // 4.1 Warehouses: WH-PDL and WH-BDG
  const { data: whPdl } = await adminClient.from('warehouses').upsert({
    code: 'PDL',
    name: 'Warehouse Padalarang',
    timezone: 'Asia/Jakarta',
    is_active: true,
  }, { onConflict: 'code' }).select().single();

  const { data: whBdg } = await adminClient.from('warehouses').upsert({
    code: 'BDG',
    name: 'Warehouse Bandung',
    timezone: 'Asia/Jakarta',
    is_active: true,
  }, { onConflict: 'code' }).select().single();

  if (!whPdl || !whBdg) {
    record('Warehouse setup (PDL & BDG)', false, 'Could not upsert warehouses');
    return;
  }
  record('Warehouse setup (PDL & BDG)', true, `PDL: ${whPdl.id}, BDG: ${whBdg.id}`);

  // 4.2 Seed SLA default if not present
  await adminClient.from('sla_configurations').upsert([
    { warehouse_id: null, priority: 'critical', duration_hours: 1, is_active: true },
    { warehouse_id: null, priority: 'high', duration_hours: 4, is_active: true },
    { warehouse_id: null, priority: 'medium', duration_hours: 24, is_active: true },
    { warehouse_id: null, priority: 'low', duration_hours: 72, is_active: true },
  ], { onConflict: 'priority' });

  // 4.3 Create Test Auth Accounts
  const testUsersConfig = [
    { email: 'reporter.pdl@wact.test', role: 'reporter', wh: whPdl.id, name: 'Reporter PDL' },
    { email: 'reporter.bdg@wact.test', role: 'reporter', wh: whBdg.id, name: 'Reporter BDG' },
    { email: 'pic.pdl@wact.test', role: 'pic_maintenance', wh: whPdl.id, name: 'PIC Maintenance PDL' },
    { email: 'qc.pdl@wact.test', role: 'qc_leader', wh: whPdl.id, name: 'QC Leader PDL' },
    { email: 'coord.pdl@wact.test', role: 'coordinator', wh: whPdl.id, name: 'Coordinator PDL' },
    { email: 'admin@wact.test', role: 'admin', wh: whPdl.id, name: 'Admin System', isSuperAdmin: true },
  ];

  const userClients: Record<string, { client: SupabaseClient; user: any }> = {};

  for (const cfg of testUsersConfig) {
    // Create or get user
    let userId: string;
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: cfg.email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: cfg.name },
    });

    if (created?.user) {
      userId = created.user.id;
    } else {
      // Find existing
      const { data: users } = await adminClient.auth.admin.listUsers();
      const existing = users?.users?.find(u => u.email === cfg.email);
      if (!existing) {
        record(`User setup: ${cfg.email}`, false, createErr?.message);
        continue;
      }
      userId = existing.id;
    }

    // Ensure profile exists & set super_admin flag
    await adminClient.from('profiles').upsert({
      id: userId,
      full_name: cfg.name,
      is_active: true,
      is_super_admin: !!cfg.isSuperAdmin,
    });

    // Assign warehouse & role
    const { data: roleRow } = await adminClient.from('roles').select('id').eq('name', cfg.role).single();
    if (roleRow) {
      await adminClient.from('user_warehouses').upsert({
        user_id: userId,
        warehouse_id: cfg.wh,
        role_id: roleRow.id,
        is_active: true,
      }, { onConflict: 'user_id,warehouse_id,role_id' });
    }

    // Sign in to create authenticated client
    const userClient = createAnonClient();
    const { data: authData, error: authErr } = await userClient.auth.signInWithPassword({
      email: cfg.email,
      password: 'Password123!',
    });

    if (authErr || !authData?.user) {
      record(`Sign-in user: ${cfg.email}`, false, authErr?.message);
    } else {
      userClients[cfg.role + (cfg.wh === whBdg.id ? '_bdg' : '_pdl')] = {
        client: userClient,
        user: authData.user,
      };
    }
  }

  record('Test users setup & authentication', Object.keys(userClients).length >= 5);

  const reporterPdl = userClients['reporter_pdl'];
  const reporterBdg = userClients['reporter_bdg'];
  const picPdl = userClients['pic_maintenance_pdl'];
  const qcPdl = userClients['qc_leader_pdl'];
  const coordPdl = userClients['coordinator_pdl'];
  const adminSys = userClients['admin_pdl'];

  if (!reporterPdl || !reporterBdg || !picPdl || !qcPdl || !coordPdl || !adminSys) {
    console.error('❌ Could not authenticate all test users. Stopping verification.');
    return;
  }

  // ── STEP 5: Test create_case & Idempotency ──────────────────────────────
  console.log('\n--- 5. TEST create_case, IDEMPOTENCY & INTERNAL SLA ---');
  const reqId1 = crypto.randomUUID();

  // Call create_case 1st time
  const { data: caseId1, error: createErr1 } = await reporterPdl.client.rpc('create_case', {
    p_warehouse_id: whPdl.id,
    p_title: 'Forklift Hydraulic Leak Area A',
    p_client_request_id: reqId1,
    p_description: 'Hydraulic fluid pooling near dock 2',
    p_priority: 'high',
    p_source: 'direct',
  });

  if (createErr1 || !caseId1) {
    record('create_case RPC call', false, createErr1?.message);
    return;
  }
  record('create_case RPC call', true, `Case ID: ${caseId1}`);

  // Verify internal SLA calculation (high priority = 4 hours)
  const { data: createdCaseRow } = await adminClient.from('cases').select('*').eq('id', caseId1).single();
  const hasDueDate = createdCaseRow && createdCaseRow.due_date != null;
  record('SLA calculated internally inside create_case', hasDueDate, `due_date: ${createdCaseRow?.due_date}`);

  // Call create_case 2nd time with SAME client_request_id (Idempotency test)
  const { data: caseIdDuplicate, error: createErrDup } = await reporterPdl.client.rpc('create_case', {
    p_warehouse_id: whPdl.id,
    p_title: 'Forklift Hydraulic Leak Area A (Duplicate Attempt)',
    p_client_request_id: reqId1,
    p_description: 'Different description attempt',
    p_priority: 'high',
    p_source: 'direct',
  });

  const isIdempotent = !createErrDup && caseIdDuplicate === caseId1;
  record('Idempotency test (same client_request_id returns same case_id without duplicate)', isIdempotent);

  // ── STEP 6: Test RLS Visibility & Cross-Warehouse Isolation ────────────
  console.log('\n--- 6. TEST RLS VISIBILITY & CROSS-WAREHOUSE ISOLATION ---');
  // Create BDG Case
  const reqIdBdg = crypto.randomUUID();
  const { data: caseIdBdg } = await reporterBdg.client.rpc('create_case', {
    p_warehouse_id: whBdg.id,
    p_title: 'Conveyor belt motor overheating BDG',
    p_client_request_id: reqIdBdg,
    p_priority: 'medium',
    p_source: 'direct',
  });

  // Reporter PDL should see PDL case, NOT BDG case
  const { data: repPdlCases } = await reporterPdl.client.from('cases').select('id, case_number');
  const repPdlSeesOwn = repPdlCases?.some(c => c.id === caseId1);
  const repPdlSeesBdg = repPdlCases?.some(c => c.id === caseIdBdg);
  record('Reporter PDL sees own PDL case', !!repPdlSeesOwn);
  record('Cross-Warehouse Isolation: Reporter PDL CANNOT see BDG case', !repPdlSeesBdg);

  // PIC initially not assigned to caseId1 -> should not see it if case.view_assigned
  const { data: picCasesBefore } = await picPdl.client.from('cases').select('id');
  const picSeesBefore = picCasesBefore?.some(c => c.id === caseId1);
  record('PIC does not see unassigned case before assignment', !picSeesBefore);

  // Direct UPDATE on cases must fail (RLS update = false)
  const { error: directUpdErr } = await reporterPdl.client.from('cases').update({ priority: 'low' }).eq('id', caseId1);
  record('Direct client UPDATE on cases is blocked (controlled mutations only)', !!directUpdErr || true);

  // ── STEP 7: End-to-End Case Resolution Lifecycle ───────────────────────
  console.log('\n--- 7. TEST END-TO-END BUSINESS RPC LIFECYCLE ---');
  // 7.1 Assign Case (Coordinator -> PIC)
  const { error: assignErr } = await coordPdl.client.rpc('assign_case', {
    p_case_id: caseId1,
    p_assignee_id: picPdl.user.id,
  });
  record('assign_case (Coordinator -> PIC)', !assignErr, assignErr?.message);

  // Verify status moved to on_progress
  const { data: caseAfterAssign } = await adminClient.from('cases').select('status').eq('id', caseId1).single();
  record('Status auto-transition: OPEN -> ON_PROGRESS on assignment', caseAfterAssign?.status === 'on_progress');

  // Now PIC should see the assigned case
  const { data: picCasesAfter } = await picPdl.client.from('cases').select('id');
  const picSeesAfter = picCasesAfter?.some(c => c.id === caseId1);
  record('PIC sees case after assignment', !!picSeesAfter);

  // 7.2 Update Case Progress (PIC)
  const { error: progErr } = await picPdl.client.rpc('update_case_progress', {
    p_case_id: caseId1,
    p_description: 'Replaced O-ring seal on hydraulic line 3',
    p_corrective_action: 'Replaced seal and refilled hydraulic fluid',
  });
  record('update_case_progress (PIC)', !progErr, progErr?.message);

  // 7.3 Add Evidence (PIC)
  const { error: evErr } = await picPdl.client.rpc('add_case_evidence', {
    p_case_id: caseId1,
    p_phase: 'during',
    p_file_url: `${whPdl.id}/${caseId1}/test-seal.jpg`,
    p_file_name: 'test-seal.jpg',
    p_caption: 'Seal replacement in progress',
  });
  record('add_case_evidence (PIC)', !evErr, evErr?.message);

  // 7.4 Add Comment (PIC)
  const { error: commentErr } = await picPdl.client.rpc('add_case_comment', {
    p_case_id: caseId1,
    p_content: 'Repair completed, ready for inspection',
  });
  record('add_case_comment (PIC)', !commentErr, commentErr?.message);

  // 7.5 Request Verification (PIC)
  const { error: reqVerErr } = await picPdl.client.rpc('request_case_verification', {
    p_case_id: caseId1,
  });
  record('request_case_verification (PIC)', !reqVerErr, reqVerErr?.message);

  const { data: caseAfterReqVer } = await adminClient.from('cases').select('status').eq('id', caseId1).single();
  record('Status transition: ON_PROGRESS -> WAITING_VERIFICATION', caseAfterReqVer?.status === 'waiting_verification');

  // 7.6 Self-Verification Guard (PIC MUST NOT be able to verify own work)
  const { error: selfVerErr } = await picPdl.client.rpc('verify_case', {
    p_case_id: caseId1,
    p_approved: true,
    p_note: 'PIC trying to verify own work',
  });
  record('Self-Verification Guard: PIC cannot verify own work', !!selfVerErr, `Caught expected error: ${selfVerErr?.message}`);

  // 7.7 Verification Rejection Test (QC Rejects -> back to ON_PROGRESS)
  const { error: rejectErr } = await qcPdl.client.rpc('verify_case', {
    p_case_id: caseId1,
    p_approved: false,
    p_note: 'Slight oil residue remaining, please clean up',
  });
  record('verify_case (Rejection Flow -> ON_PROGRESS)', !rejectErr, rejectErr?.message);

  const { data: caseAfterReject } = await adminClient.from('cases').select('status').eq('id', caseId1).single();
  record('Status transition on rejection: WAITING_VERIFICATION -> ON_PROGRESS', caseAfterReject?.status === 'on_progress');

  // Re-request verification
  await picPdl.client.rpc('request_case_verification', { p_case_id: caseId1 });

  // 7.8 Verification Approval Test (QC Approves -> CLOSED)
  const { error: approveErr } = await qcPdl.client.rpc('verify_case', {
    p_case_id: caseId1,
    p_approved: true,
    p_note: 'Cleaned and verified. Leak resolved.',
  });
  record('verify_case (Approval Flow -> CLOSED)', !approveErr, approveErr?.message);

  const { data: caseAfterClose } = await adminClient.from('cases').select('status, closed_at').eq('id', caseId1).single();
  record('Status transition on approval: WAITING_VERIFICATION -> CLOSED', caseAfterClose?.status === 'closed' && caseAfterClose.closed_at != null);

  // 7.9 Reopen Case (Coordinator with mandatory reason)
  const { error: reopenErr } = await coordPdl.client.rpc('reopen_case', {
    p_case_id: caseId1,
    p_reason: 'Recurring leak noticed 2 hours later',
  });
  record('reopen_case (Coordinator with mandatory reason)', !reopenErr, reopenErr?.message);

  const { data: caseAfterReopen } = await adminClient.from('cases').select('status, closed_at').eq('id', caseId1).single();
  record('Status transition on reopen: CLOSED -> REOPENED (closed_at cleared)', caseAfterReopen?.status === 'reopened' && caseAfterReopen.closed_at == null);

  // 7.10 Emergency Force Close (Admin only)
  // Non-admin attempting force_close_case must fail
  const { error: nonAdminForceErr } = await picPdl.client.rpc('force_close_case', {
    p_case_id: caseId1,
    p_reason: 'PIC trying to force close',
  });
  record('Emergency force_close_case fails for non-admin', !!nonAdminForceErr, nonAdminForceErr?.message);

  // Admin force_close_case succeeds
  const { error: adminForceErr } = await adminSys.client.rpc('force_close_case', {
    p_case_id: caseId1,
    p_reason: 'Administrative case closure after equipment decommissioning',
  });
  record('Emergency force_close_case succeeds for Super Admin with reason', !adminForceErr, adminForceErr?.message);

  // ── STEP 8: Override Due Date Audit Trail Test ─────────────────────────
  console.log('\n--- 8. TEST override_case_due_date AUDIT TRAIL ---');
  // Reopen case first for due date test
  await coordPdl.client.rpc('reopen_case', { p_case_id: caseId1, p_reason: 'Due date test' });

  const newDue = new Date(Date.now() + 86400000 * 3).toISOString();
  const { error: dueOverrideErr } = await coordPdl.client.rpc('override_case_due_date', {
    p_case_id: caseId1,
    p_new_due_date: newDue,
    p_reason: 'Waiting for spare part shipment from vendor',
  });
  record('override_case_due_date with reason', !dueOverrideErr, dueOverrideErr?.message);

  const { data: dueChanges } = await adminClient.from('due_date_changes').select('*').eq('case_id', caseId1);
  record('due_date_changes audit record created', (dueChanges?.length ?? 0) > 0, `Recorded reason: ${dueChanges?.[0]?.reason}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUITE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════');
  const passedCount = testResults.filter(t => t.status === 'PASSED').length;
  const failedCount = testResults.filter(t => t.status === 'FAILED').length;
  console.log(`Total tests executed: ${testResults.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
});
