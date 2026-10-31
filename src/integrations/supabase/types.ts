export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string
          details: string
          event_type: string
          generation: number
          id: number
          product_id: string
          product_name: string
          source: string
        }
        Insert: {
          created_at?: string
          details?: string
          event_type: string
          generation?: number
          id?: number
          product_id: string
          product_name?: string
          source?: string
        }
        Update: {
          created_at?: string
          details?: string
          event_type?: string
          generation?: number
          id?: number
          product_id?: string
          product_name?: string
          source?: string
        }
        Relationships: []
      }
      catalog_snapshots: {
        Row: {
          created_at: string
          payload_json: Json
          snapshot_id: string
        }
        Insert: {
          created_at?: string
          payload_json: Json
          snapshot_id: string
        }
        Update: {
          created_at?: string
          payload_json?: Json
          snapshot_id?: string
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string
          id: number
          order_id: number
          rep_id: number
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string
          id?: number
          order_id: number
          rep_id: number
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string
          id?: number
          order_id?: number
          rep_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempt_items: {
        Row: {
          attempt_id: number
          id: number
          order_item_id: number
          product_generation: number
          product_pk: number
          quantity: number
        }
        Insert: {
          attempt_id: number
          id?: number
          order_item_id: number
          product_generation: number
          product_pk: number
          quantity: number
        }
        Update: {
          attempt_id?: number
          id?: number
          order_item_id?: number
          product_generation?: number
          product_pk?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempt_items_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "delivery_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempt_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          accuracy: number | null
          cash_collected: number
          client_attempt_id: string
          created_at: string
          failure_reason: string
          id: number
          latitude: number | null
          longitude: number | null
          note: string
          order_id: number
          rep_id: number
          result: string
        }
        Insert: {
          accuracy?: number | null
          cash_collected?: number
          client_attempt_id: string
          created_at?: string
          failure_reason?: string
          id?: number
          latitude?: number | null
          longitude?: number | null
          note?: string
          order_id: number
          rep_id: number
          result: string
        }
        Update: {
          accuracy?: number | null
          cash_collected?: number
          client_attempt_id?: string
          created_at?: string
          failure_reason?: string
          id?: number
          latitude?: number | null
          longitude?: number | null
          note?: string
          order_id?: number
          rep_id?: number
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempts_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_handover_items: {
        Row: {
          amount: number
          attempt_id: number
          handover_id: number
        }
        Insert: {
          amount: number
          attempt_id: number
          handover_id: number
        }
        Update: {
          amount?: number
          attempt_id?: number
          handover_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_handover_items_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "delivery_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_handover_items_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "delivery_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_handovers: {
        Row: {
          client_handover_id: string
          created_at: string
          declared_cash: number
          handover_date: string
          id: number
          note: string
          received_cash: number | null
          rep_id: number
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          client_handover_id: string
          created_at?: string
          declared_cash: number
          handover_date: string
          id?: number
          note?: string
          received_cash?: number | null
          rep_id: number
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          client_handover_id?: string
          created_at?: string
          declared_cash?: number
          handover_date?: string
          id?: number
          note?: string
          received_cash?: number | null
          rep_id?: number
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_handovers_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      id_counter: {
        Row: {
          id: number
          next_number: number
        }
        Insert: {
          id: number
          next_number: number
        }
        Update: {
          id?: number
          next_number?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: number
          line_retail: number | null
          line_wholesale: number | null
          order_id: number
          product_generation: number | null
          product_id: string | null
          product_name: string | null
          product_pk: number | null
          quantity: number | null
          unit_retail: number | null
          unit_wholesale: number | null
        }
        Insert: {
          id?: number
          line_retail?: number | null
          line_wholesale?: number | null
          order_id: number
          product_generation?: number | null
          product_id?: string | null
          product_name?: string | null
          product_pk?: number | null
          quantity?: number | null
          unit_retail?: number | null
          unit_wholesale?: number | null
        }
        Update: {
          id?: number
          line_retail?: number | null
          line_wholesale?: number | null
          order_id?: number
          product_generation?: number | null
          product_id?: string | null
          product_name?: string | null
          product_pk?: number | null
          quantity?: number | null
          unit_retail?: number | null
          unit_wholesale?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          catalog_snapshot_id: string | null
          client_order_id: string | null
          created_at: string
          delivery_rep_id: number | null
          id: number
          idempotency_key: string | null
          outlet_id: number | null
          outlet_name: string
          price_mismatch: boolean
          rep_id: number | null
          rep_name: string
          status: string
          sync_received_at: string | null
          total_retail: number
          total_wholesale: number
        }
        Insert: {
          catalog_snapshot_id?: string | null
          client_order_id?: string | null
          created_at?: string
          delivery_rep_id?: number | null
          id?: number
          idempotency_key?: string | null
          outlet_id?: number | null
          outlet_name?: string
          price_mismatch?: boolean
          rep_id?: number | null
          rep_name: string
          status?: string
          sync_received_at?: string | null
          total_retail?: number
          total_wholesale?: number
        }
        Update: {
          catalog_snapshot_id?: string | null
          client_order_id?: string | null
          created_at?: string
          delivery_rep_id?: number | null
          id?: number
          idempotency_key?: string | null
          outlet_id?: number | null
          outlet_name?: string
          price_mismatch?: boolean
          rep_id?: number | null
          rep_name?: string
          status?: string
          sync_received_at?: string | null
          total_retail?: number
          total_wholesale?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_rep_id_fkey"
            columns: ["delivery_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_aliases: {
        Row: {
          alias: string
          created_at: string
          id: number
          outlet_id: number
        }
        Insert: {
          alias: string
          created_at?: string
          id?: number
          outlet_id: number
        }
        Update: {
          alias?: string
          created_at?: string
          id?: number
          outlet_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "outlet_aliases_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_visits: {
        Row: {
          accuracy: number | null
          client_visit_id: string | null
          id: number
          latitude: number | null
          longitude: number | null
          note: string
          order_id: number | null
          outlet_id: number
          rep_id: number | null
          rep_name: string
          visit_type: string
          visited_at: string
        }
        Insert: {
          accuracy?: number | null
          client_visit_id?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          note?: string
          order_id?: number | null
          outlet_id: number
          rep_id?: number | null
          rep_name?: string
          visit_type?: string
          visited_at?: string
        }
        Update: {
          accuracy?: number | null
          client_visit_id?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          note?: string
          order_id?: number | null
          outlet_id?: number
          rep_id?: number | null
          rep_name?: string
          visit_type?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_visits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_visits_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_visits_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          area: string
          created_at: string
          credit_limit: number | null
          id: number
          lat: number | null
          lng: number | null
          name: string
          note: string
          shop_type: string | null
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          credit_limit?: number | null
          id?: number
          lat?: number | null
          lng?: number | null
          name: string
          note?: string
          shop_type?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          credit_limit?: number | null
          id?: number
          lat?: number | null
          lng?: number | null
          name?: string
          note?: string
          shop_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_at: string
          generation: number
          id: number
          new_b2c: number | null
          new_base_price: number | null
          new_retail: number | null
          new_wholesale: number | null
          old_b2c: number | null
          old_base_price: number | null
          old_retail: number | null
          old_wholesale: number | null
          product_id: string
          product_name: string
          source: string
        }
        Insert: {
          changed_at?: string
          generation?: number
          id?: number
          new_b2c?: number | null
          new_base_price?: number | null
          new_retail?: number | null
          new_wholesale?: number | null
          old_b2c?: number | null
          old_base_price?: number | null
          old_retail?: number | null
          old_wholesale?: number | null
          product_id: string
          product_name?: string
          source?: string
        }
        Update: {
          changed_at?: string
          generation?: number
          id?: number
          new_b2c?: number | null
          new_base_price?: number | null
          new_retail?: number | null
          new_wholesale?: number | null
          old_b2c?: number | null
          old_base_price?: number | null
          old_retail?: number | null
          old_wholesale?: number | null
          product_id?: string
          product_name?: string
          source?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          b2c: number | null
          b2c_pct: number | null
          base_price: number | null
          category: string
          description: string
          generation: number
          has_image: boolean
          id: number
          image_path: string | null
          product_id: string
          product_name: string
          retail: number
          retail_pct: number | null
          status: string
          supplier: string
          unit: string
          upc: number
          updated_at: string
          wholesale: number
          wholesale_pct: number | null
        }
        Insert: {
          b2c?: number | null
          b2c_pct?: number | null
          base_price?: number | null
          category?: string
          description?: string
          generation?: number
          has_image?: boolean
          id?: number
          image_path?: string | null
          product_id?: string
          product_name?: string
          retail?: number
          retail_pct?: number | null
          status?: string
          supplier?: string
          unit?: string
          upc?: number
          updated_at?: string
          wholesale?: number
          wholesale_pct?: number | null
        }
        Update: {
          b2c?: number | null
          b2c_pct?: number | null
          base_price?: number | null
          category?: string
          description?: string
          generation?: number
          has_image?: boolean
          id?: number
          image_path?: string | null
          product_id?: string
          product_name?: string
          retail?: number
          retail_pct?: number | null
          status?: string
          supplier?: string
          unit?: string
          upc?: number
          updated_at?: string
          wholesale?: number
          wholesale_pct?: number | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          generation: number
          id: number
          ordered_quantity: number
          product_id: string
          product_name: string
          product_pk: number
          purchase_order_id: number
          received_quantity: number
          unit: string
          unit_cost: number
        }
        Insert: {
          generation?: number
          id?: number
          ordered_quantity: number
          product_id: string
          product_name: string
          product_pk: number
          purchase_order_id: number
          received_quantity?: number
          unit?: string
          unit_cost?: number
        }
        Update: {
          generation?: number
          id?: number
          ordered_quantity?: number
          product_id?: string
          product_name?: string
          product_pk?: number
          purchase_order_id?: number
          received_quantity?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          id: number
          invoice_number: string
          note: string
          order_code: string
          order_date: string
          received_at: string | null
          status: string
          supplier: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: number
          invoice_number?: string
          note?: string
          order_code: string
          order_date: string
          received_at?: string | null
          status?: string
          supplier: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: number
          invoice_number?: string
          note?: string
          order_code?: string
          order_date?: string
          received_at?: string | null
          status?: string
          supplier?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: number
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: number
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: number
          p256dh?: string
        }
        Relationships: []
      }
      rep_credentials: {
        Row: {
          password_hash: string | null
          rep_id: number
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          password_hash?: string | null
          rep_id: number
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          password_hash?: string | null
          rep_id?: number
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_credentials_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: true
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          active: boolean
          code: string
          id: number
          mobile_username: string | null
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          id?: number
          mobile_username?: string | null
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          id?: number
          mobile_username?: string | null
          name?: string
        }
        Relationships: []
      }
      stock_balances: {
        Row: {
          product_pk: number
          quantity: number
          updated_at: string
        }
        Insert: {
          product_pk: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          product_pk?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_count_lines: {
        Row: {
          book_quantity: number
          count_id: number
          counted_quantity: number | null
          generation: number
          id: number
          product_id: string
          product_name: string
          product_pk: number
          unit: string
        }
        Insert: {
          book_quantity?: number
          count_id: number
          counted_quantity?: number | null
          generation?: number
          id?: number
          product_id: string
          product_name: string
          product_pk: number
          unit?: string
        }
        Update: {
          book_quantity?: number
          count_id?: number
          counted_quantity?: number | null
          generation?: number
          id?: number
          product_id?: string
          product_name?: string
          product_pk?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          count_date: string
          created_at: string
          created_by: string
          id: number
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          count_date: string
          created_at?: string
          created_by?: string
          id?: number
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          count_date?: string
          created_at?: string
          created_by?: string
          id?: number
          status?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string
          delta: number
          generation: number
          id: number
          movement_type: string
          note: string
          product_id: string
          product_name: string
          product_pk: number
          reference: string
          unit: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by?: string
          delta: number
          generation?: number
          id?: number
          movement_type: string
          note?: string
          product_id: string
          product_name: string
          product_pk: number
          reference?: string
          unit?: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string
          delta?: number
          generation?: number
          id?: number
          movement_type?: string
          note?: string
          product_id?: string
          product_name?: string
          product_pk?: number
          reference?: string
          unit?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_stock_movement: {
        Args: {
          p_actor: string
          p_delta: number
          p_note: string
          p_product_pk: number
          p_reference: string
          p_type: string
        }
        Returns: number
      }
      approve_stock_count: {
        Args: { p_actor: string; p_count_id: number }
        Returns: undefined
      }
      assign_delivery: {
        Args: { p_actor: string; p_order_id: number; p_rep_id: number }
        Returns: undefined
      }
      create_delivery_handover: {
        Args: {
          p_attempt_ids: number[]
          p_client_handover_id: string
          p_date: string
          p_declared: number
          p_note: string
          p_rep_id: number
        }
        Returns: Json
      }
      create_mobile_order: {
        Args: {
          p_client_order_id: string
          p_collected_at: string
          p_items: Json
          p_location: Json
          p_outlet_id: number
          p_outlet_name: string
          p_rep_id: number
          p_rep_name: string
          p_snapshot_id: string
        }
        Returns: Json
      }
      create_mobile_visit: {
        Args: {
          p_client_visit_id: string
          p_location: Json
          p_note: string
          p_outlet_id: number
          p_outlet_name: string
          p_rep_id: number
          p_rep_name: string
          p_visit_type: string
          p_visited_at: string
        }
        Returns: Json
      }
      create_purchase_order: {
        Args: {
          p_actor: string
          p_date: string
          p_invoice: string
          p_items: Json
          p_note: string
          p_supplier: string
        }
        Returns: number
      }
      create_stock_count: {
        Args: { p_actor: string; p_date: string }
        Returns: number
      }
      create_web_order: {
        Args: {
          p_idempotency_key: string
          p_items: Json
          p_outlet_name: string
          p_rep_name: string
        }
        Returns: Json
      }
      delete_product_guarded: { Args: { p_pk: number }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_catalog: {
        Args: {
          p_has_description: boolean
          p_has_supplier: boolean
          p_replace: boolean
          p_rows: Json
        }
        Returns: Json
      }
      norm_text: { Args: { v: string }; Returns: string }
      peek_next_product_id: { Args: never; Returns: string }
      receive_purchase_order: {
        Args: { p_actor: string; p_po_id: number; p_quantities: Json }
        Returns: undefined
      }
      record_delivery_attempt: {
        Args: {
          p_cash: number
          p_client_attempt_id: string
          p_failure_reason: string
          p_items: Json
          p_location: Json
          p_note: string
          p_order_id: number
          p_rep_id: number
          p_result: string
        }
        Returns: Json
      }
      rep_label: { Args: { code: string; name: string }; Returns: string }
      reserve_next_product_id: { Args: never; Returns: string }
      resolve_outlet_id: {
        Args: { p_create?: boolean; p_name: string }
        Returns: number
      }
      reuse_product_id: {
        Args: { p_data: Json; p_product_id: string }
        Returns: number
      }
      seed_id_counter: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
