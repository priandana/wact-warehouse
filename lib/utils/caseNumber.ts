// lib/utils/caseNumber.ts
// Generates the human-readable case number.
// Format: WHC-{WAREHOUSE_CODE}-{yyMMdd}-{SEQ}
// Example: WHC-PDL-260822-001
//
// SECURITY: Called server-side only (inside createCase server action).
// The next_case_sequence RPC validates that the caller has case.create capability.

import { formatInTimeZone } from 'date-fns-tz';
import { createAdminClient } from '@/lib/supabase/server';

export async function generateCaseNumber(params: {
  warehouseId: string;
  warehouseCode: string;
  warehouseTimezone: string;
  createdAt: Date;
}): Promise<string> {
  const { warehouseId, warehouseCode, warehouseTimezone, createdAt } = params;

  // Convert to warehouse local date for DB (date type: 'yyyy-MM-dd')
  const localDateIso = formatInTimeZone(createdAt, warehouseTimezone, 'yyyy-MM-dd');

  // Display format for case number: yyMMdd (Year first, then Month, then Day)
  const displayDate = formatInTimeZone(createdAt, warehouseTimezone, 'yyMMdd');

  // Atomic sequence — safe under concurrent writes
  // The RPC validates case.create capability for the warehouse internally
  const supabase = createAdminClient(); // service role for RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('next_case_sequence', {
    p_warehouse_id: warehouseId,
    p_date: localDateIso,
  });

  if (error || data === null) {
    throw new Error(`Failed to generate case sequence: ${error?.message ?? 'null result'}`);
  }

  const seq = String(data).padStart(3, '0');
  return `WHC-${warehouseCode}-${displayDate}-${seq}`;
}

/**
 * Generates inspection number in same style.
 * Format: INS-{WAREHOUSE_CODE}-{yyMMdd}-{SEQ}
 */
export function formatDisplayDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyMMdd');
}
