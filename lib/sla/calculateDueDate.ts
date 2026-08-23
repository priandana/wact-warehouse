// lib/sla/calculateDueDate.ts
// Calculates case due_date from SLA configuration.
// Looks up warehouse-specific config first, falls back to global default.

import { createServerClient } from '@/lib/supabase/server';
import { addHours } from 'date-fns';

type Priority = 'low' | 'medium' | 'high' | 'critical';

export async function calculateDueDate(params: {
  warehouseId: string;
  priority: Priority;
  createdAt: Date;
}): Promise<Date> {
  const { warehouseId, priority, createdAt } = params;
  const supabase = await createServerClient();

  // Try warehouse-specific SLA first, then global fallback (warehouse_id IS NULL)
  const { data: slaRows } = await supabase
    .from('sla_configurations')
    .select('duration_hours, warehouse_id')
    .eq('priority', priority)
    .eq('is_active', true)
    .or(`warehouse_id.eq.${warehouseId},warehouse_id.is.null`)
    .order('warehouse_id', { ascending: false, nullsFirst: false })
    .limit(2);

  type SlaRow = { duration_hours: number; warehouse_id: string | null };
  const rows = (slaRows ?? []) as SlaRow[];

  // Prefer warehouse-specific over global
  const sla = rows.find((r) => r.warehouse_id === warehouseId)
    ?? rows.find((r) => r.warehouse_id === null);

  if (!sla) {
    // Hard fallback if no SLA configured at all
    const defaultHours: Record<Priority, number> = {
      critical: 1,
      high: 4,
      medium: 24,
      low: 72,
    };
    return addHours(createdAt, defaultHours[priority]);
  }

  return addHours(createdAt, Number(sla.duration_hours));
}
