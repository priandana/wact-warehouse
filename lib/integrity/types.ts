// lib/integrity/types.ts
// Domain Types & Constants for WACT Integrity Center

export type IntegrityCategory =
  | 'theft'
  | 'unauthorized_consumption'
  | 'stock_manipulation'
  | 'return_manipulation'
  | 'unauthorized_goods_movement'
  | 'asset_misuse'
  | 'supplier_vendor_collusion'
  | 'procedure_violation'
  | 'other';

export type IntegritySeverity = 'low' | 'medium' | 'high' | 'critical';

export type IntegrityStatus =
  | 'submitted'
  | 'triage'
  | 'investigating'
  | 'action_required'
  | 'resolved'
  | 'unsubstantiated'
  | 'duplicate';

export interface IntegrityCategoryMeta {
  value: IntegrityCategory;
  label: string;
  description: string;
  iconName: string;
}

export const INTEGRITY_CATEGORIES: Record<IntegrityCategory, IntegrityCategoryMeta> = {
  theft: {
    value: 'theft',
    label: 'Pencurian Barang',
    description: 'Dugaan pengambilan stok atau aset gudang tanpa hak',
    iconName: 'ShieldAlert',
  },
  unauthorized_consumption: {
    value: 'unauthorized_consumption',
    label: 'Konsumsi Barang Tanpa Izin',
    description: 'Membuka, memakan, atau menggunakan produk gudang secara tidak sah',
    iconName: 'Coffee',
  },
  stock_manipulation: {
    value: 'stock_manipulation',
    label: 'Manipulasi Stok / Adjustment',
    description: 'Perubahan jumlah stok, cycle count, atau data inventaris palsu',
    iconName: 'TrendingDown',
  },
  return_manipulation: {
    value: 'return_manipulation',
    label: 'Manipulasi Retur',
    description: 'Penyalahgunaan proses barang retur dari customer atau vendor',
    iconName: 'RotateCcw',
  },
  unauthorized_goods_movement: {
    value: 'unauthorized_goods_movement',
    label: 'Barang Keluar Tanpa Dokumen',
    description: 'Pengeluaran atau pemindahan barang tanpa surat jalan / SO sah',
    iconName: 'Truck',
  },
  asset_misuse: {
    value: 'asset_misuse',
    label: 'Penyalahgunaan Aset & Mesin',
    description: 'Penggunaan forklift, hand pallet, atau alat kerja di luar SOP',
    iconName: 'Wrench',
  },
  supplier_vendor_collusion: {
    value: 'supplier_vendor_collusion',
    label: 'Kolusi Supplier / Vendor',
    description: 'Penerimaan barang cacat sengaja, suap, atau kerjasama ilegal',
    iconName: 'Handshake',
  },
  procedure_violation: {
    value: 'procedure_violation',
    label: 'Pelanggaran Prosedur Operasional',
    description: 'Pengabaian SOP keselamatan kerja atau alur standar gudang',
    iconName: 'AlertTriangle',
  },
  other: {
    value: 'other',
    label: 'Lainnya',
    description: 'Dugaan pelanggaran integritas lain yang memerlukan investigasi',
    iconName: 'HelpCircle',
  },
};

export const INTEGRITY_STATUSES: Record<
  IntegrityStatus,
  { label: string; color: string; badgeClass: string; description: string }
> = {
  submitted: {
    label: 'Laporan Baru',
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
    description: 'Laporan telah diterima sistem dan menunggu peninjauan awal.',
  },
  triage: {
    label: 'Screening / Triage',
    color: 'indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    description: 'Laporan sedang diverifikasi kelayakan dan bukti awalnya.',
  },
  investigating: {
    label: 'Proses Investigasi',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    description: 'Tim integritas sedang melakukan pendalaman investigasi.',
  },
  action_required: {
    label: 'Perlu Tindakan',
    color: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    description: 'Memerlukan langkah tindakan tegas atau koordinasi lanjutan.',
  },
  resolved: {
    label: 'Selesai / Ditindaklanjuti',
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    description: 'Investigasi telah selesai dan tindakan tindak lanjut telah dilakukan.',
  },
  unsubstantiated: {
    label: 'Tidak Terbukti',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Bukti tidak memadai atau dugaan tidak terbukti setelah investigasi.',
  },
  duplicate: {
    label: 'Duplikat',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    description: 'Laporan serupa telah diproses dalam nomor investigasi lain.',
  },
};

export const INTEGRITY_SEVERITIES: Record<
  IntegritySeverity,
  { label: string; badgeClass: string; dotColor: string }
> = {
  low: {
    label: 'Rendah (Low)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
  },
  medium: {
    label: 'Sedang (Medium)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  high: {
    label: 'Tinggi (High)',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  critical: {
    label: 'Kritis (Critical)',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold',
    dotColor: 'bg-rose-600',
  },
};

export interface IntegrityEvidence {
  id: string;
  report_id: string;
  message_id?: string | null;
  storage_path: string;
  file_name: string;
  file_size?: number | null;
  mime_type: string;
  source_type: 'anonymous_reporter' | 'investigator';
  caption?: string | null;
  created_at: string;
  signedUrl?: string;
}

export interface IntegrityMessage {
  id: string;
  report_id: string;
  sender_type: 'anonymous_reporter' | 'investigator';
  sender_id?: string | null;
  sender_name?: string | null;
  message: string;
  created_at: string;
  evidences?: IntegrityEvidence[];
}

export interface IntegrityInternalNote {
  id: string;
  report_id: string;
  author_id: string;
  author_name?: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrityActivity {
  id: string;
  report_id: string;
  actor_type: 'anonymous_reporter' | 'investigator' | 'system';
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface IntegrityReport {
  id: string;
  report_code: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  area_id?: string | null;
  area_name?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  category: IntegrityCategory;
  severity: IntegritySeverity;
  status: IntegrityStatus;
  incident_datetime?: string | null;
  description: string;
  estimated_loss?: number | null;
  involved_party_description?: string | null;
  assigned_investigator_id?: string | null;
  assigned_investigator_name?: string | null;
  resolution_notes?: string | null;
  resolution_action?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  messages?: IntegrityMessage[];
  evidences?: IntegrityEvidence[];
  internal_notes?: IntegrityInternalNote[];
  activities?: IntegrityActivity[];
}

/**
 * Public Sanitized Model for Anonymous Reporter Tracking
 * ABSOLUTELY ZERO investigator IDs, emails, internal notes, or raw UUIDs.
 */
export interface PublicTrackedReport {
  report_code: string;
  warehouse_name: string;
  warehouse_code: string;
  category: IntegrityCategory;
  category_label: string;
  status: IntegrityStatus;
  status_label: string;
  severity: IntegritySeverity;
  incident_datetime?: string | null;
  description: string;
  estimated_loss?: number | null;
  involved_party_description?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  messages: Array<{
    id: string;
    sender_type: 'anonymous_reporter' | 'investigator';
    message: string;
    created_at: string;
    evidences?: Array<{
      id: string;
      file_name: string;
      signed_url: string;
      caption?: string | null;
    }>;
  }>;
  evidences: Array<{
    id: string;
    file_name: string;
    signed_url: string;
    caption?: string | null;
    created_at: string;
    source_type: 'anonymous_reporter' | 'investigator';
  }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ANNOUNCEMENT MANAGEMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type IntegrityAnnouncementType = 'info' | 'important' | 'warning';

export interface IntegrityPublicAnnouncement {
  id: string;
  title: string;
  body: string;
  type: IntegrityAnnouncementType;
  is_active: boolean;
  show_on_report: boolean;
  show_on_track: boolean;
  publish_start: string | null;
  publish_end: string | null;
  updated_at: string;
}

/**
 * Public Sanitized DTO for Anonymous Portal Consumers.
 * ABSOLUTELY ZERO updated_by, profile IDs, email, or internal audit metadata.
 */
export interface PublicAnnouncementDTO {
  id?: string;
  title: string;
  body: string;
  type: IntegrityAnnouncementType;
  show_on_report?: boolean;
  show_on_track?: boolean;
  publish_start?: string | null;
  publish_end?: string | null;
  updated_at?: string;
}

export type PublicAnnouncementDisplay = PublicAnnouncementDTO;
