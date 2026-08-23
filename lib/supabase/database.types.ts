// lib/supabase/database.types.ts
// Generated from Live Supabase PostgREST OpenAPI Schema
// Project: https://geidhxmkglandwjqitqg.supabase.co
// Generated at: 2026-08-23T02:38:26.463Z

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
      inspections: {
        Row: {
          id: string;
          inspection_number: string;
          asset_id: string;
          warehouse_id: string;
          template_id: string | null;
          inspector_id: string | null;
          status: string;
          overall_result: string | null;
          notes: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          inspection_number?: string | null;
          asset_id?: string | null;
          warehouse_id?: string | null;
          template_id?: string | null;
          inspector_id?: string | null;
          status?: string | null;
          overall_result?: string | null;
          notes?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          inspection_number?: string | null;
          asset_id?: string | null;
          warehouse_id?: string | null;
          template_id?: string | null;
          inspector_id?: string | null;
          status?: string | null;
          overall_result?: string | null;
          notes?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_inspector_id_fkey";
            columns: ["inspector_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      case_categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          color: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          name?: string | null;
          icon?: string | null;
          color?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          name?: string | null;
          icon?: string | null;
          color?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      due_date_changes: {
        Row: {
          id: string;
          case_id: string;
          changed_by: string;
          previous_due_date: string;
          new_due_date: string;
          reason: string;
          changed_at: string;
        };
        Insert: {
          id?: string | null;
          case_id?: string | null;
          changed_by?: string | null;
          previous_due_date?: string | null;
          new_due_date?: string | null;
          reason?: string | null;
          changed_at?: string | null;
        };
        Update: {
          id?: string | null;
          case_id?: string | null;
          changed_by?: string | null;
          previous_due_date?: string | null;
          new_due_date?: string | null;
          reason?: string | null;
          changed_at?: string | null;
        };
        Relationships: [
        ];
      };
      case_sequences: {
        Row: {
          warehouse_id: string;
          sequence_date: string;
          last_sequence: number;
        };
        Insert: {
          warehouse_id?: string | null;
          sequence_date?: string | null;
          last_sequence?: number | null;
        };
        Update: {
          warehouse_id?: string | null;
          sequence_date?: string | null;
          last_sequence?: number | null;
        };
        Relationships: [
        ];
      };
      areas: {
        Row: {
          id: string;
          warehouse_id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          warehouse_id?: string | null;
          code?: string | null;
          name?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          warehouse_id?: string | null;
          code?: string | null;
          name?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      case_comments: {
        Row: {
          id: string;
          case_id: string;
          author_id: string;
          content: string;
          is_internal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          case_id?: string | null;
          author_id?: string | null;
          content?: string | null;
          is_internal?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string | null;
          case_id?: string | null;
          author_id?: string | null;
          content?: string | null;
          is_internal?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_comments_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sla_configurations: {
        Row: {
          id: string;
          warehouse_id: string | null;
          priority: string;
          duration_hours: number;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          warehouse_id?: string | null;
          priority?: string | null;
          duration_hours?: number | null;
          is_active?: boolean | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string | null;
          warehouse_id?: string | null;
          priority?: string | null;
          duration_hours?: number | null;
          is_active?: boolean | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
        ];
      };
      root_causes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          name?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          name?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      notification_channel_configs: {
        Row: {
          id: string;
          channel: string;
          config: Record<string, any> | any[] | string | number | boolean | null | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          channel?: string | null;
          config?: Record<string, any> | any[] | string | number | boolean | null | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          channel?: string | null;
          config?: Record<string, any> | any[] | string | number | boolean | null | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      assets: {
        Row: {
          id: string;
          asset_code: string;
          name: string;
          category_id: string | null;
          warehouse_id: string;
          area_id: string | null;
          location_id: string | null;
          photo_url: string | null;
          status: string;
          specification: Record<string, any> | any[] | string | number | boolean | null | null;
          installed_date: string | null;
          qr_code_url: string | null;
          template_id: string | null;
          last_inspection_at: string | null;
          next_inspection_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          asset_code?: string | null;
          name?: string | null;
          category_id?: string | null;
          warehouse_id?: string | null;
          area_id?: string | null;
          location_id?: string | null;
          photo_url?: string | null;
          status?: string | null;
          specification?: Record<string, any> | any[] | string | number | boolean | null | null;
          installed_date?: string | null;
          qr_code_url?: string | null;
          template_id?: string | null;
          last_inspection_at?: string | null;
          next_inspection_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string | null;
          asset_code?: string | null;
          name?: string | null;
          category_id?: string | null;
          warehouse_id?: string | null;
          area_id?: string | null;
          location_id?: string | null;
          photo_url?: string | null;
          status?: string | null;
          specification?: Record<string, any> | any[] | string | number | boolean | null | null;
          installed_date?: string | null;
          qr_code_url?: string | null;
          template_id?: string | null;
          last_inspection_at?: string | null;
          next_inspection_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assets_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "asset_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      inspection_template_items: {
        Row: {
          id: string;
          section_id: string;
          label: string;
          description: string | null;
          sort_order: number;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          section_id?: string | null;
          label?: string | null;
          description?: string | null;
          sort_order?: number | null;
          is_required?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          section_id?: string | null;
          label?: string | null;
          description?: string | null;
          sort_order?: number | null;
          is_required?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      inspection_evidences: {
        Row: {
          id: string;
          inspection_id: string;
          inspection_result_id: string | null;
          uploader_id: string;
          file_url: string;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
          caption: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string | null;
          inspection_id?: string | null;
          inspection_result_id?: string | null;
          uploader_id?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          caption?: string | null;
          uploaded_at?: string | null;
        };
        Update: {
          id?: string | null;
          inspection_id?: string | null;
          inspection_result_id?: string | null;
          uploader_id?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          caption?: string | null;
          uploaded_at?: string | null;
        };
        Relationships: [
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          employee_id: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          is_super_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          full_name?: string | null;
          employee_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string | null;
          full_name?: string | null;
          employee_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
        ];
      };
      locations: {
        Row: {
          id: string;
          area_id: string;
          warehouse_id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          area_id?: string | null;
          warehouse_id?: string | null;
          code?: string | null;
          name?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          area_id?: string | null;
          warehouse_id?: string | null;
          code?: string | null;
          name?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      inspection_templates: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          description: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          name?: string | null;
          category_id?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string | null;
          name?: string | null;
          category_id?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
        ];
      };
      inspection_results: {
        Row: {
          id: string;
          inspection_id: string;
          item_id: string;
          value: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          inspection_id?: string | null;
          item_id?: string | null;
          value?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          inspection_id?: string | null;
          item_id?: string | null;
          value?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      case_daily_summary: {
        Row: {
          id: string;
          summary_date: string;
          warehouse_id: string;
          category_id: string | null;
          priority: string | null;
          status: string | null;
          total_cases: number;
          closed_cases: number;
          avg_resolution_hours: number | null;
          overdue_cases: number;
          refreshed_at: string;
        };
        Insert: {
          id?: string | null;
          summary_date?: string | null;
          warehouse_id?: string | null;
          category_id?: string | null;
          priority?: string | null;
          status?: string | null;
          total_cases?: number | null;
          closed_cases?: number | null;
          avg_resolution_hours?: number | null;
          overdue_cases?: number | null;
          refreshed_at?: string | null;
        };
        Update: {
          id?: string | null;
          summary_date?: string | null;
          warehouse_id?: string | null;
          category_id?: string | null;
          priority?: string | null;
          status?: string | null;
          total_cases?: number | null;
          closed_cases?: number | null;
          avg_resolution_hours?: number | null;
          overdue_cases?: number | null;
          refreshed_at?: string | null;
        };
        Relationships: [
        ];
      };
      case_subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          category_id?: string | null;
          name?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          category_id?: string | null;
          name?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      inspection_template_sections: {
        Row: {
          id: string;
          template_id: string;
          title: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          template_id?: string | null;
          title?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          template_id?: string | null;
          title?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      warehouses: {
        Row: {
          id: string;
          code: string;
          name: string;
          address: string | null;
          timezone: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          code?: string | null;
          name?: string | null;
          address?: string | null;
          timezone?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          code?: string | null;
          name?: string | null;
          address?: string | null;
          timezone?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      case_assignments: {
        Row: {
          id: string;
          case_id: string;
          assignee_id: string;
          assigned_by: string;
          assigned_at: string;
          unassigned_at: string | null;
          is_current: boolean;
        };
        Insert: {
          id?: string | null;
          case_id?: string | null;
          assignee_id?: string | null;
          assigned_by?: string | null;
          assigned_at?: string | null;
          unassigned_at?: string | null;
          is_current?: boolean | null;
        };
        Update: {
          id?: string | null;
          case_id?: string | null;
          assignee_id?: string | null;
          assigned_by?: string | null;
          assigned_at?: string | null;
          unassigned_at?: string | null;
          is_current?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_assignments_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_assignments_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      asset_categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          name?: string | null;
          icon?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          name?: string | null;
          icon?: string | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      cases: {
        Row: {
          id: string;
          case_number: string;
          title: string;
          description: string | null;
          category_id: string | null;
          subcategory_id: string | null;
          warehouse_id: string;
          area_id: string | null;
          location_id: string | null;
          asset_id: string | null;
          inspection_id: string | null;
          reporter_id: string;
          priority: string;
          status: string;
          has_operational_impact: boolean;
          requires_maintenance: boolean;
          source: string;
          root_cause_id: string | null;
          corrective_action: string | null;
          preventive_action: string | null;
          due_date: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
          client_request_id: string | null;
        };
        Insert: {
          id?: string | null;
          case_number?: string | null;
          title?: string | null;
          description?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          warehouse_id?: string | null;
          area_id?: string | null;
          location_id?: string | null;
          asset_id?: string | null;
          inspection_id?: string | null;
          reporter_id?: string | null;
          priority?: string | null;
          status?: string | null;
          has_operational_impact?: boolean | null;
          requires_maintenance?: boolean | null;
          source?: string | null;
          root_cause_id?: string | null;
          corrective_action?: string | null;
          preventive_action?: string | null;
          due_date?: string | null;
          closed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          client_request_id?: string | null;
        };
        Update: {
          id?: string | null;
          case_number?: string | null;
          title?: string | null;
          description?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          warehouse_id?: string | null;
          area_id?: string | null;
          location_id?: string | null;
          asset_id?: string | null;
          inspection_id?: string | null;
          reporter_id?: string | null;
          priority?: string | null;
          status?: string | null;
          has_operational_impact?: boolean | null;
          requires_maintenance?: boolean | null;
          source?: string | null;
          root_cause_id?: string | null;
          corrective_action?: string | null;
          preventive_action?: string | null;
          due_date?: string | null;
          closed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          client_request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cases_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "case_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "case_subcategories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_warehouses: {
        Row: {
          id: string;
          user_id: string;
          warehouse_id: string;
          role_id: string;
          is_active: boolean;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string | null;
          user_id?: string | null;
          warehouse_id?: string | null;
          role_id?: string | null;
          is_active?: boolean | null;
          assigned_by?: string | null;
          assigned_at?: string | null;
        };
        Update: {
          id?: string | null;
          user_id?: string | null;
          warehouse_id?: string | null;
          role_id?: string | null;
          is_active?: boolean | null;
          assigned_by?: string | null;
          assigned_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_warehouses_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_warehouses_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_warehouses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_capabilities: {
        Row: {
          role_id: string;
          capability: string;
        };
        Insert: {
          role_id?: string | null;
          capability?: string | null;
        };
        Update: {
          role_id?: string | null;
          capability?: string | null;
        };
        Relationships: [
        ];
      };
      profile_directory: {
        Row: {
          id: string | null;
          full_name: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [
        ];
      };
      case_activities: {
        Row: {
          id: string;
          case_id: string;
          actor_id: string | null;
          action: string;
          from_status: string | null;
          to_status: string | null;
          metadata: Record<string, any> | any[] | string | number | boolean | null | null;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          case_id?: string | null;
          actor_id?: string | null;
          action?: string | null;
          from_status?: string | null;
          to_status?: string | null;
          metadata?: Record<string, any> | any[] | string | number | boolean | null | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          case_id?: string | null;
          actor_id?: string | null;
          action?: string | null;
          from_status?: string | null;
          to_status?: string | null;
          metadata?: Record<string, any> | any[] | string | number | boolean | null | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_activities_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      case_evidences: {
        Row: {
          id: string;
          case_id: string;
          uploader_id: string;
          phase: string;
          file_url: string;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
          caption: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string | null;
          case_id?: string | null;
          uploader_id?: string | null;
          phase?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          caption?: string | null;
          uploaded_at?: string | null;
        };
        Update: {
          id?: string | null;
          case_id?: string | null;
          uploader_id?: string | null;
          phase?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          caption?: string | null;
          uploaded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_evidences_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_evidences_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_actions: {
        Row: {
          id: string;
          case_id: string;
          warehouse_id: string;
          pic_id: string | null;
          action_description: string;
          action_taken: string | null;
          parts_used: string | null;
          started_at: string | null;
          completed_at: string | null;
          verification_requested_at: string | null;
          verified_by: string | null;
          verified_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          case_id?: string | null;
          warehouse_id?: string | null;
          pic_id?: string | null;
          action_description?: string | null;
          action_taken?: string | null;
          parts_used?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          verification_requested_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string | null;
          case_id?: string | null;
          warehouse_id?: string | null;
          pic_id?: string | null;
          action_description?: string | null;
          action_taken?: string | null;
          parts_used?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          verification_requested_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
        ];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          name?: string | null;
          display_name?: string | null;
          description?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          name?: string | null;
          display_name?: string | null;
          description?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Record<string, any> | any[] | string | number | boolean | null | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          recipient_id?: string | null;
          type?: string | null;
          title?: string | null;
          body?: string | null;
          data?: Record<string, any> | any[] | string | number | boolean | null | null;
          is_read?: boolean | null;
          read_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          recipient_id?: string | null;
          type?: string | null;
          title?: string | null;
          body?: string | null;
          data?: Record<string, any> | any[] | string | number | boolean | null | null;
          is_read?: boolean | null;
          read_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          actor_id: string | null;
          old_data: Record<string, any> | any[] | string | number | boolean | null | null;
          new_data: Record<string, any> | any[] | string | number | boolean | null | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          table_name?: string | null;
          record_id?: string | null;
          action?: string | null;
          actor_id?: string | null;
          old_data?: Record<string, any> | any[] | string | number | boolean | null | null;
          new_data?: Record<string, any> | any[] | string | number | boolean | null | null;
          ip_address?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          table_name?: string | null;
          record_id?: string | null;
          action?: string | null;
          actor_id?: string | null;
          old_data?: Record<string, any> | any[] | string | number | boolean | null | null;
          new_data?: Record<string, any> | any[] | string | number | boolean | null | null;
          ip_address?: string | null;
          created_at?: string | null;
        };
        Relationships: [
        ];
      };
    };
    Views: {
      profile_directory: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_case: {
        Args: {
          p_warehouse_id: string;
          p_title: string;
          p_client_request_id: string;
          p_description?: string | null;
          p_category_id?: string | null;
          p_subcategory_id?: string | null;
          p_area_id?: string | null;
          p_location_id?: string | null;
          p_asset_id?: string | null;
          p_inspection_id?: string | null;
          p_priority?: string;
          p_has_operational_impact?: boolean;
          p_requires_maintenance?: boolean;
          p_source?: string;
        };
        Returns: string;
      };
      assign_case: {
        Args: { p_case_id: string; p_assignee_id: string };
        Returns: void;
      };
      update_case_progress: {
        Args: {
          p_case_id: string;
          p_description?: string | null;
          p_corrective_action?: string | null;
          p_preventive_action?: string | null;
          p_root_cause_id?: string | null;
          p_has_operational_impact?: boolean | null;
          p_requires_maintenance?: boolean | null;
        };
        Returns: void;
      };
      change_case_priority: {
        Args: { p_case_id: string; p_priority: string };
        Returns: void;
      };
      override_case_due_date: {
        Args: { p_case_id: string; p_new_due_date: string; p_reason: string };
        Returns: void;
      };
      request_case_verification: {
        Args: { p_case_id: string };
        Returns: void;
      };
      verify_case: {
        Args: { p_case_id: string; p_approved: boolean; p_note?: string | null };
        Returns: void;
      };
      reopen_case: {
        Args: { p_case_id: string; p_reason: string };
        Returns: void;
      };
      force_close_case: {
        Args: { p_case_id: string; p_reason: string };
        Returns: void;
      };
      add_case_comment: {
        Args: { p_case_id: string; p_content: string; p_is_internal?: boolean };
        Returns: string;
      };
      add_case_evidence: {
        Args: {
          p_case_id: string;
          p_phase: string;
          p_file_url: string;
          p_file_name?: string | null;
          p_file_size?: number | null;
          p_mime_type?: string | null;
          p_caption?: string | null;
        };
        Returns: string;
      };
      mark_notifications_read: {
        Args: { p_notification_ids: string[] };
        Returns: void;
      };
      get_user_warehouse_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      has_capability: {
        Args: { p_warehouse_id: string; p_capability: string };
        Returns: boolean;
      };
      is_case_participant: {
        Args: { p_case_id: string };
        Returns: boolean;
      };
      is_case_assignee: {
        Args: { p_case_id: string; p_user_id: string };
        Returns: boolean;
      };
      can_view_case_assignment: {
        Args: { p_case_id: string; p_assignee_id: string; p_assigned_by: string };
        Returns: boolean;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
