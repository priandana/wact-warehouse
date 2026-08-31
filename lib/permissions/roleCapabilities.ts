// lib/permissions/roleCapabilities.ts
// Server-side mirror of the role_capabilities DB table.
// This is the TypeScript source of truth — seeded into DB via 019_seed.sql.
// Used for UX (show/hide UI elements).
// DB has_capability() function is the primary security enforcement layer.

import { Capability } from './capabilities';

export const roleCapabilities: Record<string, Set<Capability>> = {
  reporter: new Set([
    Capability.CASE_VIEW_OWN,
    Capability.CASE_CREATE,
    Capability.EVIDENCE_UPLOAD,
    Capability.ASSET_VIEW,
  ]),

  qc_leader: new Set([
    Capability.CASE_VIEW_OWN,
    Capability.CASE_VIEW_ALL,
    Capability.CASE_CREATE,
    Capability.CASE_VERIFY,
    Capability.EVIDENCE_UPLOAD,
    Capability.ASSET_VIEW,
    Capability.INSPECTION_START,
    Capability.INSPECTION_VIEW,
    Capability.ANALYTICS_VIEW,
    Capability.REPORT_EXPORT,
  ]),

  pic_maintenance: new Set([
    Capability.CASE_VIEW_OWN,
    Capability.CASE_VIEW_ASSIGNED,
    Capability.CASE_CREATE,
    Capability.CASE_UPDATE_PROGRESS,
    Capability.CASE_REQUEST_VERIFICATION,
    Capability.EVIDENCE_UPLOAD,
    Capability.ASSET_VIEW,
    Capability.INSPECTION_VIEW,
  ]),

  coordinator: new Set([
    Capability.CASE_VIEW_OWN,
    Capability.CASE_VIEW_ALL,
    Capability.CASE_CREATE,
    Capability.CASE_ASSIGN,
    Capability.CASE_UPDATE_PROGRESS,
    Capability.CASE_CHANGE_PRIORITY,
    Capability.CASE_OVERRIDE_DUE_DATE,
    Capability.CASE_REQUEST_VERIFICATION,
    Capability.CASE_VERIFY,
    Capability.CASE_REOPEN,
    Capability.EVIDENCE_UPLOAD,
    Capability.ASSET_VIEW,
    Capability.INSPECTION_START,
    Capability.INSPECTION_VIEW,
    Capability.ANALYTICS_VIEW,
    Capability.REPORT_EXPORT,
  ]),

  regional_manager: new Set([
    Capability.CASE_VIEW_OWN,
    Capability.CASE_VIEW_ALL,
    Capability.CASE_CREATE,
    Capability.CASE_ASSIGN,
    Capability.CASE_UPDATE_PROGRESS,
    Capability.CASE_CHANGE_PRIORITY,
    Capability.CASE_OVERRIDE_DUE_DATE,
    Capability.CASE_REQUEST_VERIFICATION,
    Capability.CASE_VERIFY,
    Capability.CASE_REOPEN,
    Capability.EVIDENCE_UPLOAD,
    Capability.ASSET_VIEW,
    Capability.INSPECTION_START,
    Capability.INSPECTION_VIEW,
    Capability.ANALYTICS_VIEW,
    Capability.REPORT_EXPORT,
  ]),

  admin: new Set([
    Capability.CASE_VIEW_OWN,
    Capability.CASE_VIEW_ASSIGNED,
    Capability.CASE_VIEW_ALL,
    Capability.CASE_CREATE,
    Capability.CASE_ASSIGN,
    Capability.CASE_UPDATE_PROGRESS,
    Capability.CASE_CHANGE_PRIORITY,
    Capability.CASE_OVERRIDE_DUE_DATE,
    Capability.CASE_REQUEST_VERIFICATION,
    Capability.CASE_VERIFY,
    Capability.CASE_REOPEN,
    Capability.CASE_FORCE_CLOSE,
    Capability.ASSET_VIEW,
    Capability.ASSET_MANAGE,
    Capability.INSPECTION_START,
    Capability.INSPECTION_VIEW,
    Capability.INSPECTION_MANAGE_TEMPLATE,
    Capability.EVIDENCE_UPLOAD,
    Capability.ANALYTICS_VIEW,
    Capability.REPORT_EXPORT,
    Capability.MASTER_DATA_MANAGE,
    Capability.SLA_MANAGE,
    Capability.USER_MANAGE,
    Capability.WAREHOUSE_MANAGE,
  ]),

  integrity_investigator: new Set([
    Capability.INTEGRITY_VIEW,
    Capability.INTEGRITY_INVESTIGATE,
    Capability.INTEGRITY_ASSIGN,
    Capability.INTEGRITY_CHANGE_SEVERITY,
    Capability.INTEGRITY_MESSAGE,
    Capability.INTEGRITY_INTERNAL_NOTE,
    Capability.INTEGRITY_RESOLVE,
    Capability.INTEGRITY_EXPORT,
  ]),
};
