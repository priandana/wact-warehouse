// app/api/integrity/warehouses/route.ts
// Public unauthenticated route for loading active warehouse list in Integrity Center
// Zero cookies, zero auth headers, returns only public warehouse id, name, and code.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data: warehouses, error } = await adminClient
      .from('warehouses')
      .select('id, name, code')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error || !warehouses) {
      return NextResponse.json({ warehouses: [] });
    }

    return NextResponse.json({ warehouses });
  } catch {
    return NextResponse.json({ warehouses: [] });
  }
}
