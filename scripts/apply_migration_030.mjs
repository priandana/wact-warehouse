import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function applyMigration030() {
  console.log('Applying Migration 030: Asset Category Cleanup...');

  const legacyNames = ['Equipment', 'Facility', 'Vehicle', 'IT Device', 'Safety', 'Other'];
  const officialNames = [
    'Hand Pallet', 'Forklift', 'Reach Truck', 'PTL', 'Rack',
    'Scanner', 'Printer', 'Scale', 'APAR', 'Lamp / Lighting',
    'Chiller / Freezer Equipment', 'Other Equipment'
  ];

  const { error: err1, count: c1 } = await client
    .from('asset_categories')
    .update({ is_active: false }, { count: 'exact' })
    .in('name', legacyNames);

  if (err1) {
    console.error('Error deactivating legacy categories:', err1);
    process.exit(1);
  }

  const { error: err2, count: c2 } = await client
    .from('asset_categories')
    .update({ is_active: true }, { count: 'exact' })
    .in('name', officialNames);

  if (err2) {
    console.error('Error activating official categories:', err2);
    process.exit(1);
  }

  console.log(`Deactivated ${c1} legacy categories.`);
  console.log(`Ensured ${c2} official categories are active.`);

  const { count: activeCount } = await client
    .from('asset_categories')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: inactiveCount } = await client
    .from('asset_categories')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', false);

  const { count: totalCount } = await client
    .from('asset_categories')
    .select('id', { count: 'exact', head: true });

  console.log(`Total: ${totalCount} rows (Active: ${activeCount}, Inactive: ${inactiveCount})`);
}

applyMigration030();
