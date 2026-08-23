import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedAssets() {
  console.log('Seeding Phase 2B Assets for BDG and PDL...');

  const bdgWhId = '2b06562e-05fc-4526-9ef8-88d004944872';
  const pdlWhId = 'afe3b4a3-e0ea-41b0-93d4-89e6f0cbcb09';

  // Get areas for BDG and PDL
  const { data: bdgAreas } = await adminClient.from('areas').select('id, name').eq('warehouse_id', bdgWhId);
  const { data: pdlAreas } = await adminClient.from('areas').select('id, name').eq('warehouse_id', pdlWhId);

  const bdgArea1 = bdgAreas?.[0]?.id || null;
  const bdgArea2 = bdgAreas?.[1]?.id || bdgArea1;
  const pdlArea1 = pdlAreas?.[0]?.id || null;

  // 12 Asset Categories
  const { data: categories } = await adminClient.from('asset_categories').select('id, name');
  const catMap = new Map((categories || []).map((c) => [c.name, c.id]));

  const assetsToSeed = [
    {
      warehouse_id: bdgWhId,
      asset_code: 'BDG-FL-001',
      name: 'Forklift Electric 2.5 Ton',
      category_id: catMap.get('Forklift') || null,
      area_id: bdgArea1,
      status: 'active',
      installed_date: '2025-02-10',
      qr_code_url: 'WACT-BDG-FL-001',
      specification: {
        brand: 'Toyota',
        model: '8FBE20',
        serial_number: 'SN-TY-202501',
        condition: 'good',
        notes: 'Forklift utama area receiving/unloading.',
      },
    },
    {
      warehouse_id: bdgWhId,
      asset_code: 'BDG-HP-002',
      name: 'Hand Pallet Heavy Duty 3T',
      category_id: catMap.get('Hand Pallet') || null,
      area_id: bdgArea1,
      status: 'active',
      installed_date: '2025-01-20',
      qr_code_url: 'WACT-BDG-HP-002',
      specification: {
        brand: 'Bishamon',
        model: 'BM30-HD',
        serial_number: 'SN-BSM-8910',
        condition: 'good',
        notes: 'Roda tandem PU baru diganti bulan lalu.',
      },
    },
    {
      warehouse_id: bdgWhId,
      asset_code: 'BDG-RT-003',
      name: 'Reach Truck 1.5T High Bay 8M',
      category_id: catMap.get('Reach Truck') || null,
      area_id: bdgArea2,
      status: 'maintenance',
      installed_date: '2024-11-05',
      qr_code_url: 'WACT-BDG-RT-003',
      specification: {
        brand: 'Crown',
        model: 'ESR5200',
        serial_number: 'SN-CRW-5542',
        condition: 'fair',
        notes: 'Sedang dalam pengecekan sensor hidrolik mast.',
      },
    },
    {
      warehouse_id: bdgWhId,
      asset_code: 'BDG-SC-004',
      name: 'Industrial Scanner Gun 2D',
      category_id: catMap.get('Scanner') || null,
      area_id: bdgArea2,
      status: 'active',
      installed_date: '2025-03-01',
      qr_code_url: 'WACT-BDG-SC-004',
      specification: {
        brand: 'Zebra',
        model: 'TC26 Mobile Computer',
        serial_number: 'SN-ZB-77821',
        condition: 'good',
        notes: 'Terhubung ke WiFi AP-BDG-03.',
      },
    },
    {
      warehouse_id: bdgWhId,
      asset_code: 'BDG-AP-005',
      name: 'APAR Powder 6kg ABC',
      category_id: catMap.get('APAR') || null,
      area_id: bdgArea1,
      status: 'active',
      installed_date: '2024-06-15',
      qr_code_url: 'WACT-BDG-AP-005',
      specification: {
        brand: 'Yamato',
        model: 'YA-6NX',
        serial_number: 'SN-YM-9901',
        condition: 'good',
        notes: 'Indikator tekanan di zona hijau prima.',
      },
    },
    // PDL Asset for Cross-Warehouse Check
    {
      warehouse_id: pdlWhId,
      asset_code: 'PDL-FL-001',
      name: 'Forklift Diesel 3.0 Ton PDL',
      category_id: catMap.get('Forklift') || null,
      area_id: pdlArea1,
      status: 'active',
      installed_date: '2025-01-10',
      qr_code_url: 'WACT-PDL-FL-001',
      specification: {
        brand: 'Mitsubishi',
        model: 'FD30NT',
        serial_number: 'SN-MIT-3001',
        condition: 'good',
        notes: 'Aset khusus Warehouse Padalarang.',
      },
    },
  ];

  for (const ast of assetsToSeed) {
    const { data, error } = await adminClient.from('assets').upsert(ast, {
      onConflict: 'warehouse_id,asset_code',
    }).select('id, asset_code, name').single();

    if (error) {
      console.error(`Failed to upsert asset ${ast.asset_code}:`, error.message);
    } else {
      console.log(`✓ Upserted asset: ${data.asset_code} — ${data.name} (ID: ${data.id})`);
    }
  }

  console.log('Seeding Phase 2B Assets completed!');
}

seedAssets();
