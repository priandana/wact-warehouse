// lib/permissions/capabilities.ts
// Capability string-literal constants — used both in TypeScript (app layer)
// and seeded into role_capabilities DB table (enforcement layer).
// NEVER use role-level comparisons. Always check explicit capabilities.

export const Capability = {
  // Cases
  CASE_VIEW_OWN:             'case.view_own',
  CASE_VIEW_ASSIGNED:        'case.view_assigned',
  CASE_VIEW_ALL:             'case.view_all',
  CASE_CREATE:               'case.create',
  CASE_ASSIGN:               'case.assign',
  CASE_UPDATE_PROGRESS:      'case.update_progress',
  CASE_CHANGE_PRIORITY:      'case.change_priority',
  CASE_OVERRIDE_DUE_DATE:    'case.override_due_date',
  CASE_REQUEST_VERIFICATION: 'case.request_verification',
  CASE_VERIFY:               'case.verify',
  CASE_REOPEN:               'case.reopen',
  /** Emergency admin-only close — bypasses standard flow. Requires mandatory reason. */
  CASE_FORCE_CLOSE:          'case.force_close',


  // Assets
  ASSET_VIEW:                'asset.view',
  ASSET_MANAGE:              'asset.manage',

  // Inspections
  INSPECTION_START:          'inspection.start',
  INSPECTION_VIEW:           'inspection.view',
  INSPECTION_MANAGE_TEMPLATE:'inspection.manage_template',

  // Evidence
  EVIDENCE_UPLOAD:           'evidence.upload',

  // Analytics & Reports
  ANALYTICS_VIEW:            'analytics.view',
  REPORT_EXPORT:             'report.export',

  // Administration
  MASTER_DATA_MANAGE:        'master_data.manage',
  SLA_MANAGE:                'sla.manage',
  USER_MANAGE:               'user.manage',
  WAREHOUSE_MANAGE:          'warehouse.manage',

  // Integrity Center (Anonymous Reporting & Investigation)
  INTEGRITY_VIEW:            'integrity.view',
  INTEGRITY_INVESTIGATE:     'integrity.investigate',
  INTEGRITY_ASSIGN:          'integrity.assign',
  INTEGRITY_CHANGE_SEVERITY: 'integrity.change_severity',
  INTEGRITY_MESSAGE:         'integrity.message',
  INTEGRITY_INTERNAL_NOTE:   'integrity.internal_note',
  INTEGRITY_RESOLVE:         'integrity.resolve',
  INTEGRITY_EXPORT:          'integrity.export',
} as const;

export type Capability = typeof Capability[keyof typeof Capability];
