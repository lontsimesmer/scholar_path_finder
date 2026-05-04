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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          id: string
          language: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content_en: string
          content_fr: string
          created_at: string
          excerpt_en: string
          excerpt_fr: string
          id: string
          image_url: string
          slug_en: string
          slug_fr: string
          status: string
          title_en: string
          title_fr: string
          updated_at: string
        }
        Insert: {
          content_en: string
          content_fr: string
          created_at?: string
          excerpt_en: string
          excerpt_fr: string
          id?: string
          image_url: string
          slug_en: string
          slug_fr: string
          status?: string
          title_en: string
          title_fr: string
          updated_at?: string
        }
        Update: {
          content_en?: string
          content_fr?: string
          created_at?: string
          excerpt_en?: string
          excerpt_fr?: string
          id?: string
          image_url?: string
          slug_en?: string
          slug_fr?: string
          status?: string
          title_en?: string
          title_fr?: string
          updated_at?: string
        }
        Relationships: []
      }
      edge_request_events: {
        Row: {
          bucket_key: string
          created_at: string
          id: string
          metadata: Json
          scope: string
        }
        Insert: {
          bucket_key: string
          created_at?: string
          id?: string
          metadata?: Json
          scope: string
        }
        Update: {
          bucket_key?: string
          created_at?: string
          id?: string
          metadata?: Json
          scope?: string
        }
        Relationships: []
      }
      flyway_schema_history: {
        Row: {
          checksum: number | null
          description: string
          execution_time: number
          installed_by: string
          installed_on: string
          installed_rank: number
          script: string
          success: boolean
          type: string
          version: string | null
        }
        Insert: {
          checksum?: number | null
          description: string
          execution_time: number
          installed_by: string
          installed_on?: string
          installed_rank: number
          script: string
          success: boolean
          type: string
          version?: string | null
        }
        Update: {
          checksum?: number | null
          description?: string
          execution_time?: number
          installed_by?: string
          installed_on?: string
          installed_rank?: number
          script?: string
          success?: boolean
          type?: string
          version?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          follow_up_count: number | null
          id: string
          last_follow_up_at: string | null
          message: string
          name: string
          next_follow_up_at: string | null
          payment_id: string | null
          payment_status: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          follow_up_count?: number | null
          id?: string
          last_follow_up_at?: string | null
          message: string
          name: string
          next_follow_up_at?: string | null
          payment_id?: string | null
          payment_status?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          follow_up_count?: number | null
          id?: string
          last_follow_up_at?: string | null
          message?: string
          name?: string
          next_follow_up_at?: string | null
          payment_id?: string | null
          payment_status?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          channel: string
          created_at: string
          currency: string
          customer_address: string | null
          customer_city: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone_number: string | null
          customer_state: string | null
          customer_surname: string | null
          customer_zip_code: string | null
          id: string
          last_checked_at: string | null
          lead_id: string
          local_status: string
          metadata: Json
          payment_method: string | null
          payment_token: string | null
          payment_url: string | null
          provider: string
          provider_fund_availability_date: string | null
          provider_operator_id: string | null
          provider_payment_date: string | null
          provider_response_id: string | null
          provider_status: string | null
          raw_initialization_response: Json | null
          raw_last_notification: Json | null
          raw_last_status_response: Json | null
          student_id: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          channel: string
          created_at?: string
          currency: string
          customer_address?: string | null
          customer_city?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone_number?: string | null
          customer_state?: string | null
          customer_surname?: string | null
          customer_zip_code?: string | null
          id?: string
          last_checked_at?: string | null
          lead_id: string
          local_status?: string
          metadata?: Json
          payment_method?: string | null
          payment_token?: string | null
          payment_url?: string | null
          provider: string
          provider_fund_availability_date?: string | null
          provider_operator_id?: string | null
          provider_payment_date?: string | null
          provider_response_id?: string | null
          provider_status?: string | null
          raw_initialization_response?: Json | null
          raw_last_notification?: Json | null
          raw_last_status_response?: Json | null
          student_id: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          channel?: string
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone_number?: string | null
          customer_state?: string | null
          customer_surname?: string | null
          customer_zip_code?: string | null
          id?: string
          last_checked_at?: string | null
          lead_id?: string
          local_status?: string
          metadata?: Json
          payment_method?: string | null
          payment_token?: string | null
          payment_url?: string | null
          provider?: string
          provider_fund_availability_date?: string | null
          provider_operator_id?: string | null
          provider_payment_date?: string | null
          provider_response_id?: string | null
          provider_status?: string | null
          raw_initialization_response?: Json | null
          raw_last_notification?: Json | null
          raw_last_status_response?: Json | null
          student_id?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_lead_id_fkey"
            columns: ["lead_id"]
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      student_admin_activity_logs: {
        Row: {
          action_label: string | null
          action_type: string
          admin_email: string
          application_id: string | null
          created_at: string
          details: Json
          document_id: string | null
          id: string
          student_id: string
        }
        Insert: {
          action_label?: string | null
          action_type: string
          admin_email: string
          application_id?: string | null
          created_at?: string
          details?: Json
          document_id?: string | null
          id?: string
          student_id: string
        }
        Update: {
          action_label?: string | null
          action_type?: string
          admin_email?: string
          application_id?: string | null
          created_at?: string
          details?: Json
          document_id?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_admin_activity_logs_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "student_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_admin_activity_logs_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      student_admin_notes: {
        Row: {
          admin_email: string
          created_at: string
          id: string
          note: string
          student_id: string
          updated_at: string
        }
        Insert: {
          admin_email: string
          created_at?: string
          id?: string
          note: string
          student_id: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          created_at?: string
          id?: string
          note?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_applications: {
        Row: {
          assigned_advisor_id: string | null
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_advisor_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_advisor_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_contact_verification_challenges: {
        Row: {
          attempts_count: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          max_attempts: number
          metadata: Json
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          channel: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          max_attempts?: number
          metadata?: Json
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          max_attempts?: number
          metadata?: Json
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_contact_verifications: {
        Row: {
          created_at: string
          email: string | null
          email_verification_required: boolean
          email_verified_at: string | null
          phone_number: string | null
          sms_verification_required: boolean
          sms_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verification_required?: boolean
          email_verified_at?: string | null
          phone_number?: string | null
          sms_verification_required?: boolean
          sms_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verification_required?: boolean
          email_verified_at?: string | null
          phone_number?: string | null
          sms_verification_required?: boolean
          sms_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          admin_feedback: string | null
          application_id: string | null
          created_at: string
          file_path: string
          file_type: string | null
          id: string
          status: string
          student_id: string
          title: string
        }
        Insert: {
          admin_feedback?: string | null
          application_id?: string | null
          created_at?: string
          file_path: string
          file_type?: string | null
          id?: string
          status?: string
          student_id: string
          title: string
        }
        Update: {
          admin_feedback?: string | null
          application_id?: string | null
          created_at?: string
          file_path?: string
          file_type?: string | null
          id?: string
          status?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_application_id_fkey"
            columns: ["application_id"]
            referencedRelation: "student_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          current_degree: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          profile_invalidated_at: string | null
          profile_locked_at: string | null
          profile_validation_comment: string | null
          target_country: string | null
          target_program: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          current_degree?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          profile_invalidated_at?: string | null
          profile_locked_at?: string | null
          profile_validation_comment?: string | null
          target_country?: string | null
          target_program?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          current_degree?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          profile_invalidated_at?: string | null
          profile_locked_at?: string | null
          profile_validation_comment?: string | null
          target_country?: string | null
          target_program?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status:
        | "consultation_paid"
        | "profile_evaluation"
        | "university_selection"
        | "application_submitted"
        | "admission_received"
        | "visa_processing"
        | "visa_granted"
        | "completed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      application_status: [
        "consultation_paid",
        "profile_evaluation",
        "university_selection",
        "application_submitted",
        "admission_received",
        "visa_processing",
        "visa_granted",
        "completed",
      ],
    },
  },
} as const
