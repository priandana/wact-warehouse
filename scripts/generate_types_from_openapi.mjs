// scripts/generate_types_from_openapi.mjs
// Generates lib/supabase/database.types.ts directly from Supabase PostgREST OpenAPI schema with Relationships

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !key) {
  console.error('Missing credentials');
  process.exit(1);
}

function mapType(prop) {
  if (!prop) return 'any';
  const format = prop.format;
  const type = prop.type;

  if (type === 'integer' || type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'any[]';
  if (type === 'object') return 'Record<string, any> | null';
  if (format === 'json' || format === 'jsonb') return 'Record<string, any> | any[] | string | number | boolean | null';
  return 'string';
}

const tableRelationships = {
  user_warehouses: [
    { foreignKeyName: 'user_warehouses_role_id_fkey', columns: ['role_id'], isOneToOne: false, referencedRelation: 'roles', referencedColumns: ['id'] },
    { foreignKeyName: 'user_warehouses_warehouse_id_fkey', columns: ['warehouse_id'], isOneToOne: false, referencedRelation: 'warehouses', referencedColumns: ['id'] },
    { foreignKeyName: 'user_warehouses_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
  ],
  cases: [
    { foreignKeyName: 'cases_warehouse_id_fkey', columns: ['warehouse_id'], isOneToOne: false, referencedRelation: 'warehouses', referencedColumns: ['id'] },
    { foreignKeyName: 'cases_reporter_id_fkey', columns: ['reporter_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
    { foreignKeyName: 'cases_category_id_fkey', columns: ['category_id'], isOneToOne: false, referencedRelation: 'case_categories', referencedColumns: ['id'] },
    { foreignKeyName: 'cases_subcategory_id_fkey', columns: ['subcategory_id'], isOneToOne: false, referencedRelation: 'case_subcategories', referencedColumns: ['id'] },
    { foreignKeyName: 'cases_area_id_fkey', columns: ['area_id'], isOneToOne: false, referencedRelation: 'areas', referencedColumns: ['id'] },
    { foreignKeyName: 'cases_location_id_fkey', columns: ['location_id'], isOneToOne: false, referencedRelation: 'locations', referencedColumns: ['id'] },
    { foreignKeyName: 'cases_asset_id_fkey', columns: ['asset_id'], isOneToOne: false, referencedRelation: 'assets', referencedColumns: ['id'] },
  ],
  case_assignments: [
    { foreignKeyName: 'case_assignments_case_id_fkey', columns: ['case_id'], isOneToOne: false, referencedRelation: 'cases', referencedColumns: ['id'] },
    { foreignKeyName: 'case_assignments_assignee_id_fkey', columns: ['assignee_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
    { foreignKeyName: 'case_assignments_assigned_by_fkey', columns: ['assigned_by'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
  ],
  case_activities: [
    { foreignKeyName: 'case_activities_case_id_fkey', columns: ['case_id'], isOneToOne: false, referencedRelation: 'cases', referencedColumns: ['id'] },
    { foreignKeyName: 'case_activities_actor_id_fkey', columns: ['actor_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
  ],
  case_comments: [
    { foreignKeyName: 'case_comments_case_id_fkey', columns: ['case_id'], isOneToOne: false, referencedRelation: 'cases', referencedColumns: ['id'] },
    { foreignKeyName: 'case_comments_author_id_fkey', columns: ['author_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
  ],
  case_evidences: [
    { foreignKeyName: 'case_evidences_case_id_fkey', columns: ['case_id'], isOneToOne: false, referencedRelation: 'cases', referencedColumns: ['id'] },
    { foreignKeyName: 'case_evidences_uploader_id_fkey', columns: ['uploader_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
  ],
  assets: [
    { foreignKeyName: 'assets_warehouse_id_fkey', columns: ['warehouse_id'], isOneToOne: false, referencedRelation: 'warehouses', referencedColumns: ['id'] },
    { foreignKeyName: 'assets_area_id_fkey', columns: ['area_id'], isOneToOne: false, referencedRelation: 'areas', referencedColumns: ['id'] },
    { foreignKeyName: 'assets_category_id_fkey', columns: ['category_id'], isOneToOne: false, referencedRelation: 'asset_categories', referencedColumns: ['id'] },
  ],
  inspections: [
    { foreignKeyName: 'inspections_warehouse_id_fkey', columns: ['warehouse_id'], isOneToOne: false, referencedRelation: 'warehouses', referencedColumns: ['id'] },
    { foreignKeyName: 'inspections_asset_id_fkey', columns: ['asset_id'], isOneToOne: false, referencedRelation: 'assets', referencedColumns: ['id'] },
    { foreignKeyName: 'inspections_inspector_id_fkey', columns: ['inspector_id'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] },
  ],
};

async function generate() {
  const url = supabaseUrl + '/rest/v1/';
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Accept': 'application/openapi+json'
    }
  });

  const spec = await res.json();
  const defs = spec.definitions || {};

  let output = `// lib/supabase/database.types.ts
// Generated from Live Supabase PostgREST OpenAPI Schema
// Project: ${supabaseUrl}
// Generated at: ${new Date().toISOString()}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
`;

  for (const [tableName, tableDef] of Object.entries(defs)) {
    const props = tableDef.properties || {};
    const req = new Set(tableDef.required || []);
    const rels = tableRelationships[tableName] || [];

    output += `      ${tableName}: {\n`;
    output += `        Row: {\n`;
    for (const [colName, colDef] of Object.entries(props)) {
      const tsType = mapType(colDef);
      const isNullable = !req.has(colName);
      output += `          ${colName}: ${tsType}${isNullable ? ' | null' : ''};\n`;
    }
    output += `        };\n`;

    output += `        Insert: {\n`;
    for (const [colName, colDef] of Object.entries(props)) {
      const tsType = mapType(colDef);
      output += `          ${colName}?: ${tsType} | null;\n`;
    }
    output += `        };\n`;

    output += `        Update: {\n`;
    for (const [colName, colDef] of Object.entries(props)) {
      const tsType = mapType(colDef);
      output += `          ${colName}?: ${tsType} | null;\n`;
    }
    output += `        };\n`;

    output += `        Relationships: [\n`;
    for (const rel of rels) {
      output += `          {\n`;
      output += `            foreignKeyName: "${rel.foreignKeyName}";\n`;
      output += `            columns: ${JSON.stringify(rel.columns)};\n`;
      output += `            isOneToOne: ${rel.isOneToOne};\n`;
      output += `            referencedRelation: "${rel.referencedRelation}";\n`;
      output += `            referencedColumns: ${JSON.stringify(rel.referencedColumns)};\n`;
      output += `          },\n`;
    }
    output += `        ];\n`;
    output += `      };\n`;
  }

  output += `    };\n`;
  output += `    Views: {\n`;
  output += `      profile_directory: {\n`;
  output += `        Row: {\n`;
  output += `          id: string;\n`;
  output += `          full_name: string;\n`;
  output += `          avatar_url: string | null;\n`;
  output += `        };\n`;
  output += `        Relationships: [];\n`;
  output += `      };\n`;
  output += `    };\n`;
  output += `    Functions: {\n`;
  output += `      create_case: {\n`;
  output += `        Args: {\n`;
  output += `          p_warehouse_id: string;\n`;
  output += `          p_title: string;\n`;
  output += `          p_client_request_id: string;\n`;
  output += `          p_description?: string | null;\n`;
  output += `          p_category_id?: string | null;\n`;
  output += `          p_subcategory_id?: string | null;\n`;
  output += `          p_area_id?: string | null;\n`;
  output += `          p_location_id?: string | null;\n`;
  output += `          p_asset_id?: string | null;\n`;
  output += `          p_inspection_id?: string | null;\n`;
  output += `          p_priority?: string;\n`;
  output += `          p_has_operational_impact?: boolean;\n`;
  output += `          p_requires_maintenance?: boolean;\n`;
  output += `          p_source?: string;\n`;
  output += `        };\n`;
  output += `        Returns: string;\n`;
  output += `      };\n`;
  output += `      assign_case: {\n`;
  output += `        Args: { p_case_id: string; p_assignee_id: string };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      update_case_progress: {\n`;
  output += `        Args: {\n`;
  output += `          p_case_id: string;\n`;
  output += `          p_description?: string | null;\n`;
  output += `          p_corrective_action?: string | null;\n`;
  output += `          p_preventive_action?: string | null;\n`;
  output += `          p_root_cause_id?: string | null;\n`;
  output += `          p_has_operational_impact?: boolean | null;\n`;
  output += `          p_requires_maintenance?: boolean | null;\n`;
  output += `        };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      change_case_priority: {\n`;
  output += `        Args: { p_case_id: string; p_priority: string };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      override_case_due_date: {\n`;
  output += `        Args: { p_case_id: string; p_new_due_date: string; p_reason: string };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      request_case_verification: {\n`;
  output += `        Args: { p_case_id: string };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      verify_case: {\n`;
  output += `        Args: { p_case_id: string; p_approved: boolean; p_note?: string | null };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      reopen_case: {\n`;
  output += `        Args: { p_case_id: string; p_reason: string };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      force_close_case: {\n`;
  output += `        Args: { p_case_id: string; p_reason: string };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      add_case_comment: {\n`;
  output += `        Args: { p_case_id: string; p_content: string; p_is_internal?: boolean };\n`;
  output += `        Returns: string;\n`;
  output += `      };\n`;
  output += `      add_case_evidence: {\n`;
  output += `        Args: {\n`;
  output += `          p_case_id: string;\n`;
  output += `          p_phase: string;\n`;
  output += `          p_file_url: string;\n`;
  output += `          p_file_name?: string | null;\n`;
  output += `          p_file_size?: number | null;\n`;
  output += `          p_mime_type?: string | null;\n`;
  output += `          p_caption?: string | null;\n`;
  output += `        };\n`;
  output += `        Returns: string;\n`;
  output += `      };\n`;
  output += `      mark_notifications_read: {\n`;
  output += `        Args: { p_notification_ids: string[] };\n`;
  output += `        Returns: void;\n`;
  output += `      };\n`;
  output += `      get_user_warehouse_ids: {\n`;
  output += `        Args: Record<PropertyKey, never>;\n`;
  output += `        Returns: string[];\n`;
  output += `      };\n`;
  output += `      has_capability: {\n`;
  output += `        Args: { p_warehouse_id: string; p_capability: string };\n`;
  output += `        Returns: boolean;\n`;
  output += `      };\n`;
  output += `      is_case_participant: {\n`;
  output += `        Args: { p_case_id: string };\n`;
  output += `        Returns: boolean;\n`;
  output += `      };\n`;
  output += `      is_case_assignee: {\n`;
  output += `        Args: { p_case_id: string; p_user_id: string };\n`;
  output += `        Returns: boolean;\n`;
  output += `      };\n`;
  output += `      can_view_case_assignment: {\n`;
  output += `        Args: { p_case_id: string; p_assignee_id: string; p_assigned_by: string };\n`;
  output += `        Returns: boolean;\n`;
  output += `      };\n`;
  output += `    };\n`;
  output += `    Enums: {};\n`;
  output += `    CompositeTypes: {};\n`;
  output += `  };\n`;
  output += `};\n`;

  const targetPath = path.resolve(process.cwd(), 'lib/supabase/database.types.ts');
  fs.writeFileSync(targetPath, output, 'utf8');
  console.log('✅ Generated lib/supabase/database.types.ts with Relationships successfully!');
}

generate().catch(err => {
  console.error('Error generating types:', err);
  process.exit(1);
});
