import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const qcClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const picClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const caseId = 'af4fa63f-2423-4655-af0c-d65a90ac9f44';
const pdlWhId = 'afe3b4a3-e0ea-41b0-93d4-89e6f0cbcb09';

// ── Step 1: Login QC Leader BDG ───────────────────────────────────────────
const { data: qcAuth, error: qcLoginErr } = await qcClient.auth.signInWithPassword({
  email: 'qc.bdg@wact.test',
  password: 'Password123!',
});

console.log('=== Step 1: Login QC Leader BDG ===');
console.log('QC User ID:', qcAuth?.user?.id);
console.log('Login Error:', qcLoginErr);

// Check warehouse access
const { data: qcWarehouses } = await qcClient
  .from('user_warehouses')
  .select('warehouse_id, is_active, warehouses(code, name), roles(name, display_name)')
  .eq('user_id', qcAuth.user.id);
console.log('QC Active Warehouses:', JSON.stringify(qcWarehouses, null, 2));

// Check Cross-Warehouse Isolation: try to query PDL cases
const { data: pdlCases, error: pdlErr } = await qcClient
  .from('cases')
  .select('id, case_number, warehouse_id')
  .eq('warehouse_id', pdlWhId);
console.log('PDL Cases returned for QC BDG (Should be 0 due to RLS):', pdlCases?.length, 'error:', pdlErr);

// ── Step 2: Check Case Status Before Reject ──────────────────────────────
const { data: caseBeforeReject } = await qcClient
  .from('cases')
  .select('id, case_number, status')
  .eq('id', caseId)
  .single();
console.log('=== Step 2: Case Status before Reject ===', caseBeforeReject);

// ── Step 3: QC REJECT Verification (waiting_verification -> on_progress) ──
console.log('=== Step 3: QC Reject Verification ===');
const { data: rejectRes, error: rejectErr } = await qcClient.rpc('verify_case', {
  p_case_id: caseId,
  p_approved: false,
  p_note: 'Pallet masih ada yang menonjol 2cm di sisi kiri, tolong rapikan kembali dan pastikan aman.',
});
console.log('verify_case reject result:', { rejectRes, rejectErr });

const { data: caseAfterReject } = await qcClient
  .from('cases')
  .select('id, case_number, status')
  .eq('id', caseId)
  .single();
console.log('Case Status after Reject (Should be on_progress):', caseAfterReject);

// ── Step 4: Verify PIC sees the task back in progress ────────────────────
console.log('=== Step 4: Verify PIC session sees task in on_progress ===');
const { data: picAuth } = await picClient.auth.signInWithPassword({
  email: 'pic.bdg@wact.test',
  password: 'Password123!',
});
const { data: picCase } = await picClient
  .from('cases')
  .select('id, case_number, status')
  .eq('id', caseId)
  .single();
console.log('PIC view of case status:', picCase);

// ── Step 5: PIC Re-requests Verification (on_progress -> waiting_verification)
console.log('=== Step 5: PIC Re-requests Verification ===');
const { data: reReqRes, error: reReqErr } = await picClient.rpc('request_case_verification', {
  p_case_id: caseId,
});
console.log('request_case_verification result:', { reReqRes, reReqErr });

const { data: caseAfterReReq } = await picClient
  .from('cases')
  .select('id, case_number, status')
  .eq('id', caseId)
  .single();
console.log('Case Status after Re-request (Should be waiting_verification):', caseAfterReReq);

// ── Step 6: QC APPROVES and CLOSES Case (waiting_verification -> closed) ──
console.log('=== Step 6: QC Approves and Closes Case ===');
const { data: approveRes, error: approveErr } = await qcClient.rpc('verify_case', {
  p_case_id: caseId,
  p_approved: true,
  p_note: 'Pekerjaan perbaikan telah dicek langsung di lokasi, kondisi rapi, aman, dan memenuhi standar QC.',
});
console.log('verify_case approve result:', { approveRes, approveErr });

const { data: caseFinal } = await qcClient
  .from('cases')
  .select('id, case_number, status, closed_at')
  .eq('id', caseId)
  .single();
console.log('Case Status Final (Should be closed):', caseFinal);

// ── Step 7: Check Activity Log / Audit Trail ─────────────────────────────
console.log('=== Step 7: Case Activities / Audit Trail ===');
const { data: activities } = await qcClient
  .from('case_activities')
  .select('action, from_status, to_status, metadata, created_at, actor:actor_id(full_name)')
  .eq('case_id', caseId)
  .order('created_at', { ascending: false })
  .limit(5);
console.log('Recent Activities:', JSON.stringify(activities, null, 2));
