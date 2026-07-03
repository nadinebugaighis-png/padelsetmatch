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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_profile_id: string
          blocker_profile_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_profile_id: string
          blocker_profile_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_profile_id?: string
          blocker_profile_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          profile_id: string | null
          rating: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          profile_id?: string | null
          rating?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          profile_id?: string | null
          rating?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hides: {
        Row: {
          category: string
          created_at: string
          hidden_profile_id: string
          hider_profile_id: string
          id: string
        }
        Insert: {
          category?: string
          created_at?: string
          hidden_profile_id: string
          hider_profile_id: string
          id?: string
        }
        Update: {
          category?: string
          created_at?: string
          hidden_profile_id?: string
          hider_profile_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hides_hidden_profile_id_fkey"
            columns: ["hidden_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hides_hider_profile_id_fkey"
            columns: ["hider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          liked_profile_id: string
          liker_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_profile_id: string
          liker_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_profile_id?: string
          liker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_liked_profile_id_fkey"
            columns: ["liked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_liker_profile_id_fkey"
            columns: ["liker_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_event_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_event_id: string
          sender_profile_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_event_id: string
          sender_profile_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_event_id?: string
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_event_messages_match_event_id_fkey"
            columns: ["match_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_event_participants: {
        Row: {
          id: string
          joined_at: string
          match_event_id: string
          profile_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          match_event_id: string
          profile_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          match_event_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_event_participants_match_event_id_fkey"
            columns: ["match_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          city: string | null
          club_address: string | null
          club_lat: number | null
          club_lng: number | null
          club_name: string
          club_place_id: string | null
          country: string | null
          court_booked: boolean
          created_at: string
          extra_confirmed: number
          gender_rule: Database["public"]["Enums"]["match_gender_rule"]
          host_profile_id: string
          id: string
          level_max: string
          level_min: string
          note: string | null
          playtomic_link: string | null
          starts_at: string
          status: Database["public"]["Enums"]["match_event_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          club_address?: string | null
          club_lat?: number | null
          club_lng?: number | null
          club_name: string
          club_place_id?: string | null
          country?: string | null
          court_booked?: boolean
          created_at?: string
          extra_confirmed?: number
          gender_rule?: Database["public"]["Enums"]["match_gender_rule"]
          host_profile_id: string
          id?: string
          level_max?: string
          level_min?: string
          note?: string | null
          playtomic_link?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["match_event_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          club_address?: string | null
          club_lat?: number | null
          club_lng?: number | null
          club_name?: string
          club_place_id?: string | null
          country?: string | null
          court_booked?: boolean
          created_at?: string
          extra_confirmed?: number
          gender_rule?: Database["public"]["Enums"]["match_gender_rule"]
          host_profile_id?: string
          id?: string
          level_max?: string
          level_min?: string
          note?: string | null
          playtomic_link?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["match_event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reads: {
        Row: {
          last_read_at: string
          match_id: string
          profile_id: string
        }
        Insert: {
          last_read_at?: string
          match_id: string
          profile_id: string
        }
        Update: {
          last_read_at?: string
          match_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reads_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          profile_a: string
          profile_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          profile_a: string
          profile_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          profile_a?: string
          profile_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          match_id: string
          sender_profile_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          match_id: string
          sender_profile_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          match_id?: string
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      no_shows: {
        Row: {
          created_at: string
          id: string
          match_id: string
          reported_profile_id: string
          reporter_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          reported_profile_id: string
          reporter_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          reported_profile_id?: string
          reporter_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_shows_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_shows_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_shows_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      played_confirmations: {
        Row: {
          created_at: string
          id: string
          match_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "played_confirmations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "played_confirmations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          age_max: number
          age_min: number
          availability: string[] | null
          bio: string | null
          court_side: string | null
          created_at: string
          first_name: string
          free_court_access: boolean
          free_court_note: string | null
          friend_interested_in: string[]
          gender: string | null
          gender_custom: string | null
          id: string
          intents: string[]
          interested_in: string[]
          is_seed: boolean
          languages: string[]
          level: string
          locations: string[]
          looking_for: string
          mixed_doubles: boolean | null
          nationality: string | null
          no_show_count: number
          onboarding_stage: string
          padel_style: string[]
          partner_interested_in: string[]
          personal_traits: string[]
          photo_url: string | null
          played_count: number
          priorities: string[]
          sexual_orientation: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string | null
          zone: string | null
        }
        Insert: {
          age?: number | null
          age_max?: number
          age_min?: number
          availability?: string[] | null
          bio?: string | null
          court_side?: string | null
          created_at?: string
          first_name: string
          free_court_access?: boolean
          free_court_note?: string | null
          friend_interested_in?: string[]
          gender?: string | null
          gender_custom?: string | null
          id?: string
          intents?: string[]
          interested_in?: string[]
          is_seed?: boolean
          languages?: string[]
          level: string
          locations?: string[]
          looking_for?: string
          mixed_doubles?: boolean | null
          nationality?: string | null
          no_show_count?: number
          onboarding_stage?: string
          padel_style?: string[]
          partner_interested_in?: string[]
          personal_traits?: string[]
          photo_url?: string | null
          played_count?: number
          priorities?: string[]
          sexual_orientation?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
          zone?: string | null
        }
        Update: {
          age?: number | null
          age_max?: number
          age_min?: number
          availability?: string[] | null
          bio?: string | null
          court_side?: string | null
          created_at?: string
          first_name?: string
          free_court_access?: boolean
          free_court_note?: string | null
          friend_interested_in?: string[]
          gender?: string | null
          gender_custom?: string | null
          id?: string
          intents?: string[]
          interested_in?: string[]
          is_seed?: boolean
          languages?: string[]
          level?: string
          locations?: string[]
          looking_for?: string
          mixed_doubles?: boolean | null
          nationality?: string | null
          no_show_count?: number
          onboarding_stage?: string
          padel_style?: string[]
          partner_interested_in?: string[]
          personal_traits?: string[]
          photo_url?: string | null
          played_count?: number
          priorities?: string[]
          sexual_orientation?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      qa_answers: {
        Row: {
          answer: string
          answer_norm: string
          category: string
          created_at: string
          id: string
          profile_id: string
          question: string
        }
        Insert: {
          answer: string
          answer_norm: string
          category?: string
          created_at?: string
          id?: string
          profile_id: string
          question: string
        }
        Update: {
          answer?: string
          answer_norm?: string
          category?: string
          created_at?: string
          id?: string
          profile_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_profile_id: string
          reported_user_id: string | null
          reporter_profile_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_profile_id: string
          reported_user_id?: string | null
          reporter_profile_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_profile_id?: string
          reported_user_id?: string | null
          reporter_profile_id?: string
          reviewed_at?: string | null
          status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_profile_id: { Args: never; Returns: string }
      public_match_view: { Args: { _event_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      match_event_status: "open" | "full" | "cancelled" | "played"
      match_gender_rule: "mixed" | "men_only" | "women_only"
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
      app_role: ["admin", "moderator", "user"],
      match_event_status: ["open", "full", "cancelled", "played"],
      match_gender_rule: ["mixed", "men_only", "women_only"],
    },
  },
} as const
