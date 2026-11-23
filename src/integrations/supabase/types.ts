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
      financial_entries: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["entry_type"]
          id: string
          is_cancelled: boolean
          member_id: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["entry_type"]
          id?: string
          is_cancelled?: boolean
          member_id?: string | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["entry_type"]
          id?: string
          is_cancelled?: boolean
          member_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tithers: {
        Row: {
          is_tither: boolean
          member_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          is_tither?: boolean
          member_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          is_tither?: boolean
          member_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_tithers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_date: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          joined_at: string | null
          notes: string | null
          phone: string | null
          phone_digits: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          joined_at?: string | null
          notes?: string | null
          phone?: string | null
          phone_digits?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          joined_at?: string | null
          notes?: string | null
          phone?: string | null
          phone_digits?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          converted_at: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          member_id: string | null
          notes: string | null
          phone: string
          phone_digits: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          member_id?: string | null
          notes?: string | null
          phone: string
          phone_digits?: string | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          phone?: string
          phone_digits?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_visitor_to_member: {
        Args: { _visitor_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "secretaria"
      entry_type: "dizimo" | "oferta"
      member_status: "ativo" | "inativo"
      payment_method: "pix" | "dinheiro" | "transferencia" | "outro"
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
      app_role: ["admin", "secretaria"],
      entry_type: ["dizimo", "oferta"],
      member_status: ["ativo", "inativo"],
      payment_method: ["pix", "dinheiro", "transferencia", "outro"],
    },
  },
} as const
