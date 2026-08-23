// lib/supabase/database.types.ts
// Auto-generated Supabase type definitions.
// Replace this file by running: pnpm supabase gen types typescript --linked
// after connecting to your Supabase project.
//
// This stub keeps TypeScript happy during Phase 1.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          employee_id: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          is_super_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; full_name: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      warehouses: {
        Row: {
          id: string
          code: string
          name: string
          address: string | null
          timezone: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['warehouses']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['warehouses']['Row']>
      }
      roles: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['roles']['Row']>
      }
      role_capabilities: {
        Row: { role_id: string; capability: string }
        Insert: Database['public']['Tables']['role_capabilities']['Row']
        Update: Partial<Database['public']['Tables']['role_capabilities']['Row']>
      }
      user_warehouses: {
        Row: {
          id: string
          user_id: string
          warehouse_id: string
          role_id: string
          is_active: boolean
          assigned_by: string | null
          assigned_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_warehouses']['Row'], 'id' | 'assigned_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['user_warehouses']['Row']>
      }
      cases: {
        Row: {
          id: string
          case_number: string
          title: string
          description: string | null
          category_id: string | null
          subcategory_id: string | null
          warehouse_id: string
          area_id: string | null
          location_id: string | null
          asset_id: string | null
          inspection_id: string | null
          reporter_id: string
          priority: 'low' | 'medium' | 'high' | 'critical'
          status: 'open' | 'on_progress' | 'waiting_repair' | 'waiting_verification' | 'closed' | 'reopened'
          has_operational_impact: boolean
          requires_maintenance: boolean
          source: 'direct' | 'inspection'
          root_cause_id: string | null
          corrective_action: string | null
          preventive_action: string | null
          due_date: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cases']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['cases']['Row']>
      }
      case_assignments: {
        Row: {
          id: string
          case_id: string
          assignee_id: string
          assigned_by: string
          assigned_at: string
          unassigned_at: string | null
          is_current: boolean
        }
        Insert: Omit<Database['public']['Tables']['case_assignments']['Row'], 'id' | 'assigned_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['case_assignments']['Row']>
      }
      case_activities: {
        Row: {
          id: string
          case_id: string
          actor_id: string | null
          action: string
          from_status: string | null
          to_status: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['case_activities']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: never
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          type: string
          title: string
          body: string | null
          data: Json | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Pick<Database['public']['Tables']['notifications']['Row'], 'is_read' | 'read_at'>
      }
      sla_configurations: {
        Row: {
          id: string
          warehouse_id: string | null
          priority: 'low' | 'medium' | 'high' | 'critical'
          duration_hours: number
          is_active: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sla_configurations']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['sla_configurations']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_warehouse_ids: { Args: Record<string, never>; Returns: string[] }
      has_capability: { Args: { p_warehouse_id: string; p_capability: string }; Returns: boolean }
      is_case_participant: { Args: { p_case_id: string }; Returns: boolean }
      next_case_sequence: { Args: { p_warehouse_id: string; p_date: string }; Returns: number }
      log_case_activity: { Args: { p_case_id: string; p_action: string; p_from_status?: string; p_to_status?: string; p_metadata?: Json }; Returns: string }
      send_notification: { Args: { p_recipient_id: string; p_type: string; p_title: string; p_body?: string; p_data?: Json }; Returns: string }
    }
    Enums: Record<string, never>
  }
}
