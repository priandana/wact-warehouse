import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const picClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 1. Authenticate as PIC Maintenance BDG
const { data: authData } = await picClient.auth.signInWithPassword({
  email: 'pic.bdg@wact.test',
  password: 'Password123!',
});

const caseId = 'af4fa63f-2423-4655-af0c-d65a90ac9f44';
console.log('Authenticated as PIC:', authData.user.id);

// 2. Fetch root causes
const { data: rootCauses } = await picClient.from('root_causes').select('id, name').limit(1);
const rootCauseId = rootCauses?.[0]?.id || null;
console.log('Root Cause ID to use:', rootCauseId);

// 3. Test RPC: update_case_progress
console.log('--- 1. Testing update_case_progress ---');
const { data: progressRes, error: progressErr } = await picClient.rpc('update_case_progress', {
  p_case_id: caseId,
  p_corrective_action: 'Mengganti pallet kayu rusak dengan heavy-duty plastic pallet.',
  p_preventive_action: 'Inspeksi berkala pada staging area sebelum penempatan barang.',
  p_root_cause_id: rootCauseId,
  p_has_operational_impact: true,
  p_requires_maintenance: true,
});
console.log('update_case_progress result:', { progressRes, progressErr });

// 4. Test RPC: add_case_evidence (phase: after)
console.log('--- 2. Testing add_case_evidence (phase: after) ---');
const { data: evidenceRes, error: evidenceErr } = await picClient.rpc('add_case_evidence', {
  p_case_id: caseId,
  p_phase: 'after',
  p_file_url: 'af4fa63f-2423-4655-af0c-d65a90ac9f44/after_repair_01.jpg',
  p_file_name: 'after_repair_01.jpg',
  p_file_size: 154200,
  p_mime_type: 'image/jpeg',
  p_caption: 'Foto jalur forklift setelah pallet rusak dipindahkan & area dibersihkan',
});
console.log('add_case_evidence result:', { evidenceRes, evidenceErr });

// 5. Test RPC: request_case_verification
console.log('--- 3. Testing request_case_verification ---');
const { data: reqVerifRes, error: reqVerifErr } = await picClient.rpc('request_case_verification', {
  p_case_id: caseId,
});
console.log('request_case_verification result:', { reqVerifRes, reqVerifErr });

// 6. Verify case status changed to waiting_verification
const { data: updatedCase } = await picClient
  .from('cases')
  .select('id, case_number, status, corrective_action, preventive_action, root_cause_id')
  .eq('id', caseId)
  .single();
console.log('Case status after request verification:', updatedCase);

// 7. Verify PIC CANNOT approve / verify own case (Self-verification prevention)
console.log('--- 4. Testing Self-Verification Prevention (verify_case) ---');
const { data: verifyRes, error: verifyErr } = await picClient.rpc('verify_case', {
  p_case_id: caseId,
  p_approved: true,
  p_note: 'Mencoba verifikasi diri sendiri oleh PIC',
});
console.log('verify_case by PIC (should fail):', {
  verifyRes,
  expectedError: verifyErr?.message || verifyErr,
});
