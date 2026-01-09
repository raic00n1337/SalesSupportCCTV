// TypeScript types for Supabase database schema
// Generated based on the SQL schema

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
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          tier: 'eco' | 'premium' | 'high-risk'
          manufacturer: 'AXIS' | 'Hanwha' | 'AJAX' | 'Keenfinity'
          hanwha_series: 'A-Series' | 'Q/X-Series' | null
          ajax_series: 'Baseline' | 'Superior' | null
          video_management: 'nvr' | 'vms'
          storage_days: number
          storage_hdd_size: number | null
          storage_hdd_quantity: number | null
          ups_required: boolean
          remote_capable: boolean
          vms_multi_monitor: boolean | null
          network_cabinet_9he: boolean | null
          lift_platform: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          tier: 'eco' | 'premium' | 'high-risk'
          manufacturer: 'AXIS' | 'Hanwha' | 'AJAX' | 'Keenfinity'
          hanwha_series?: 'A-Series' | 'Q/X-Series' | null
          ajax_series?: 'Baseline' | 'Superior' | null
          video_management: 'nvr' | 'vms'
          storage_days: number
          storage_hdd_size?: number | null
          storage_hdd_quantity?: number | null
          ups_required?: boolean
          remote_capable?: boolean
          vms_multi_monitor?: boolean | null
          network_cabinet_9he?: boolean | null
          lift_platform?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          tier?: 'eco' | 'premium' | 'high-risk'
          manufacturer?: 'AXIS' | 'Hanwha' | 'AJAX' | 'Keenfinity'
          hanwha_series?: 'A-Series' | 'Q/X-Series' | null
          ajax_series?: 'Baseline' | 'Superior' | null
          video_management?: 'nvr' | 'vms'
          storage_days?: number
          storage_hdd_size?: number | null
          storage_hdd_quantity?: number | null
          ups_required?: boolean
          remote_capable?: boolean
          vms_multi_monitor?: boolean | null
          network_cabinet_9he?: boolean | null
          lift_platform?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          project_id: string
          name: string
          cabling: 'copper' | 'fiber' | 'wlan-bridge'
          is_standalone: boolean
          outdoor: boolean
          cameras: Json // CameraWithMountConfig
          ip_doc_enabled: boolean | null
          ip_start: string | null
          ip_gateway: string | null
          ip_cidr: string | null
          ip_video_device_prefix: string | null
          ip_network_device_prefix: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          cabling: 'copper' | 'fiber' | 'wlan-bridge'
          is_standalone?: boolean
          outdoor?: boolean
          cameras: Json
          ip_doc_enabled?: boolean | null
          ip_start?: string | null
          ip_gateway?: string | null
          ip_cidr?: string | null
          ip_video_device_prefix?: string | null
          ip_network_device_prefix?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          cabling?: 'copper' | 'fiber' | 'wlan-bridge'
          is_standalone?: boolean
          outdoor?: boolean
          cameras?: Json
          ip_doc_enabled?: boolean | null
          ip_start?: string | null
          ip_gateway?: string | null
          ip_cidr?: string | null
          ip_video_device_prefix?: string | null
          ip_network_device_prefix?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          project_id: string
          snapshot_data: Json // Full BOM + project state
          total_amount_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          snapshot_data: Json
          total_amount_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          snapshot_data?: Json
          total_amount_cents?: number
          created_at?: string
        }
      }
      manufacturers: {
        Row: {
          id: string
          name: string
          slug: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          manufacturer_id: string
          category: string
          sku: string
          eso_number: string
          name: string
          description: string | null
          uvp_cents: number
          tags: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          manufacturer_id: string
          category: string
          sku: string
          eso_number: string
          name: string
          description?: string | null
          uvp_cents: number
          tags?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          manufacturer_id?: string
          category?: string
          sku?: string
          eso_number?: string
          name?: string
          description?: string | null
          uvp_cents?: number
          tags?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tier_defaults: {
        Row: {
          id: string
          tier: 'eco' | 'premium' | 'high-risk'
          manufacturer_slug: string
          category: string
          product_sku: string
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tier: 'eco' | 'premium' | 'high-risk'
          manufacturer_slug: string
          category: string
          product_sku: string
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tier?: 'eco' | 'premium' | 'high-risk'
          manufacturer_slug?: string
          category?: string
          product_sku?: string
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          name: string
          rule_json: Json
          scope: string | null
          priority: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          rule_json: Json
          scope?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          rule_json?: Json
          scope?: string | null
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
