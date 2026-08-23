import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const caseId = 'af4fa63f-2423-4655-af0c-d65a90ac9f44';
const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
  email: 'reporter.pdl@wact.test',
  password: 'Password123!'
});

console.log('--- Testing query as authenticated user ---', { userId: authData?.user?.id, authErr });

const { data: caseItem, error: caseErr } = await anonClient
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
    category:category_id ( name ),
    subcategory:subcategory_id ( name ),
    reporter:reporter_id ( full_name )
  `)
  .eq('id', caseId)
  .maybeSingle();

console.log('Authenticated case query result:', {
  case_number: caseItem?.case_number,
  error: caseErr
});

const { data: evidences, error: evErr } = await anonClient
  .from('case_evidences')
  .select(`
    id,
    phase,
    file_url,
    file_name,
    file_size,
    mime_type,
    caption,
    uploaded_at,
    uploader:uploader_id ( full_name )
  `)
  .eq('case_id', caseId);

console.log('Authenticated evidences query result:', {
  evidencesCount: evidences?.length,
  evidences,
  error: evErr
});
