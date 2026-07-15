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
      coach_endorsements: {
        Row: {
          approved_at: string | null
          coach_profile_id: string
          comment: string | null
          created_at: string
          id: string
          stars: number | null
          status: string
          student_profile_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          coach_profile_id: string
          comment?: string | null
          created_at?: string
          id?: string
          stars?: number | null
          status?: string
          student_profile_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          coach_profile_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          stars?: number | null
          status?: string
          student_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_endorsements_coach_profile_id_fkey"
            columns: ["coach_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_endorsements_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibility_feedback: {
        Row: {
          created_at: string
          feedback_reason: string | null
          id: string
          rater_profile_id: string
          subject_profile_id: string
          thumbs: number
        }
        Insert: {
          created_at?: string
          feedback_reason?: string | null
          id?: string
          rater_profile_id: string
          subject_profile_id: string
          thumbs: number
        }
        Update: {
          created_at?: string
          feedback_reason?: string | null
          id?: string
          rater_profile_id?: string
          subject_profile_id?: string
          thumbs?: number
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_feedback_rater_profile_id_fkey"
            columns: ["rater_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compatibility_feedback_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibility_scores: {
        Row: {
          blurb: string
          created_at: string
          friction: string | null
          model_version: string
          profile_a: string
          profile_b: string
          reasons: string[]
          score: number
          sub_scores: Json | null
        }
        Insert: {
          blurb: string
          created_at?: string
          friction?: string | null
          model_version?: string
          profile_a: string
          profile_b: string
          reasons?: string[]
          score: number
          sub_scores?: Json | null
        }
        Update: {
          blurb?: string
          created_at?: string
          friction?: string | null
          model_version?: string
          profile_a?: string
          profile_b?: string
          reasons?: string[]
          score?: number
          sub_scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_scores_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compatibility_scores_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_comments: {
        Row: {
          author_profile_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_profile_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connect_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "connect_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_posts: {
        Row: {
          author_profile_id: string
          body: string
          category: Database["public"]["Enums"]["connect_category"]
          city: string | null
          created_at: string
          expires_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_profile_id: string
          body: string
          category?: Database["public"]["Enums"]["connect_category"]
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          category?: Database["public"]["Enums"]["connect_category"]
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_posts_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          favorite_profile_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          favorite_profile_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          favorite_profile_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_favorite_profile_id_fkey"
            columns: ["favorite_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      friendships: {
        Row: {
          addressee_profile_id: string
          created_at: string
          id: string
          requester_profile_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["friendship_status"]
        }
        Insert: {
          addressee_profile_id: string
          created_at?: string
          id?: string
          requester_profile_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Update: {
          addressee_profile_id?: string
          created_at?: string
          id?: string
          requester_profile_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["friendship_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_profile_id_fkey"
            columns: ["addressee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_participants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          invited_by_profile_id: string | null
          level: string
          match_event_id: string
          phone: string
          session_token: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          invited_by_profile_id?: string | null
          level: string
          match_event_id: string
          phone: string
          session_token?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          invited_by_profile_id?: string | null
          level?: string
          match_event_id?: string
          phone?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_participants_invited_by_profile_id_fkey"
            columns: ["invited_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_participants_match_event_id_fkey"
            columns: ["match_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
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
      match_alert_hits: {
        Row: {
          alert_id: string
          created_at: string
          match_event_id: string
          reason: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          match_event_id: string
          reason: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          match_event_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_alert_hits_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "match_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_alert_hits_match_event_id_fkey"
            columns: ["match_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
        ]
      }
      match_alerts: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          days_of_week: number[]
          hour_end: number
          hour_start: number
          id: string
          label: string | null
          level_only: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          days_of_week?: number[]
          hour_end?: number
          hour_start?: number
          id?: string
          label?: string | null
          level_only?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          days_of_week?: number[]
          hour_end?: number
          hour_start?: number
          id?: string
          label?: string | null
          level_only?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_event_invites: {
        Row: {
          created_at: string
          id: string
          invitee_profile_id: string | null
          inviter_profile_id: string
          match_event_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["match_invite_status"]
          token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_profile_id?: string | null
          inviter_profile_id: string
          match_event_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["match_invite_status"]
          token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_profile_id?: string | null
          inviter_profile_id?: string
          match_event_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["match_invite_status"]
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_event_invites_invitee_profile_id_fkey"
            columns: ["invitee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_invites_inviter_profile_id_fkey"
            columns: ["inviter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_invites_match_event_id_fkey"
            columns: ["match_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
        ]
      }
      match_event_messages: {
        Row: {
          body: string
          created_at: string
          edited_at: string | null
          guest_id: string | null
          id: string
          match_event_id: string
          sender_profile_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          edited_at?: string | null
          guest_id?: string | null
          id?: string
          match_event_id: string
          sender_profile_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          edited_at?: string | null
          guest_id?: string | null
          id?: string
          match_event_id?: string
          sender_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_event_messages_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guest_participants"
            referencedColumns: ["id"]
          },
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
          invite_lock_until: string | null
          is_private_court: boolean
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
          invite_lock_until?: string | null
          is_private_court?: boolean
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
          invite_lock_until?: string | null
          is_private_court?: boolean
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
      match_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          match_id: string
          rated_profile_id: string
          rater_profile_id: string
          stars: number
          tags: string[]
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          match_id: string
          rated_profile_id: string
          rater_profile_id: string
          stars: number
          tags?: string[]
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          match_id?: string
          rated_profile_id?: string
          rater_profile_id?: string
          stars?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "match_ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_ratings_rated_profile_id_fkey"
            columns: ["rated_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_ratings_rater_profile_id_fkey"
            columns: ["rater_profile_id"]
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
          accepted_at: string | null
          created_at: string
          id: string
          initiator_profile_id: string | null
          last_message_at: string
          origin: string
          profile_a: string
          profile_b: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          initiator_profile_id?: string | null
          last_message_at?: string
          origin?: string
          profile_a: string
          profile_b: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          initiator_profile_id?: string | null
          last_message_at?: string
          origin?: string
          profile_a?: string
          profile_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_initiator_profile_id_fkey"
            columns: ["initiator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      notification_prefs: {
        Row: {
          coach_requests: boolean
          connect_activity: boolean
          favorite_activity: boolean
          match_participants: boolean
          matches: boolean
          messages: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          coach_requests?: boolean
          connect_activity?: boolean
          favorite_activity?: boolean
          match_participants?: boolean
          matches?: boolean
          messages?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          coach_requests?: boolean
          connect_activity?: boolean
          favorite_activity?: boolean
          match_participants?: boolean
          matches?: boolean
          messages?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          profile_id: string
          read_at?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
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
      profile_venues: {
        Row: {
          created_at: string
          is_public: boolean
          profile_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          is_public?: boolean
          profile_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          is_public?: boolean
          profile_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_venues_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
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
          away_until: string | null
          bio: string | null
          court_side: string | null
          created_at: string
          favorite_clubs: string[]
          first_name: string
          founding_number: number | null
          free_court_access: boolean
          free_court_note: string | null
          friend_interested_in: string[]
          gender: string | null
          gender_custom: string | null
          id: string
          intents: string[]
          interested_in: string[]
          is_coach: boolean
          is_seed: boolean
          languages: string[]
          level: string
          level_detail: string | null
          locations: string[]
          looking_for: string
          looking_for_tags: string[]
          main_goal: string | null
          mixed_doubles: boolean | null
          nationality: string | null
          no_show_count: number
          onboarding_stage: string
          other_sports: string[]
          padel_style: string[]
          partner_interested_in: string[]
          personal_traits: string[]
          photo_moderation_reason: string | null
          photo_moderation_status: string
          photo_url: string | null
          play_frequency: string | null
          played_count: number
          priorities: string[]
          sexual_orientation: string | null
          story_hook_en: string | null
          story_hook_es: string | null
          story_hook_fr: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string | null
          world_mode: boolean | null
          zone: string | null
        }
        Insert: {
          age?: number | null
          age_max?: number
          age_min?: number
          availability?: string[] | null
          away_until?: string | null
          bio?: string | null
          court_side?: string | null
          created_at?: string
          favorite_clubs?: string[]
          first_name: string
          founding_number?: number | null
          free_court_access?: boolean
          free_court_note?: string | null
          friend_interested_in?: string[]
          gender?: string | null
          gender_custom?: string | null
          id?: string
          intents?: string[]
          interested_in?: string[]
          is_coach?: boolean
          is_seed?: boolean
          languages?: string[]
          level: string
          level_detail?: string | null
          locations?: string[]
          looking_for?: string
          looking_for_tags?: string[]
          main_goal?: string | null
          mixed_doubles?: boolean | null
          nationality?: string | null
          no_show_count?: number
          onboarding_stage?: string
          other_sports?: string[]
          padel_style?: string[]
          partner_interested_in?: string[]
          personal_traits?: string[]
          photo_moderation_reason?: string | null
          photo_moderation_status?: string
          photo_url?: string | null
          play_frequency?: string | null
          played_count?: number
          priorities?: string[]
          sexual_orientation?: string | null
          story_hook_en?: string | null
          story_hook_es?: string | null
          story_hook_fr?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
          world_mode?: boolean | null
          zone?: string | null
        }
        Update: {
          age?: number | null
          age_max?: number
          age_min?: number
          availability?: string[] | null
          away_until?: string | null
          bio?: string | null
          court_side?: string | null
          created_at?: string
          favorite_clubs?: string[]
          first_name?: string
          founding_number?: number | null
          free_court_access?: boolean
          free_court_note?: string | null
          friend_interested_in?: string[]
          gender?: string | null
          gender_custom?: string | null
          id?: string
          intents?: string[]
          interested_in?: string[]
          is_coach?: boolean
          is_seed?: boolean
          languages?: string[]
          level?: string
          level_detail?: string | null
          locations?: string[]
          looking_for?: string
          looking_for_tags?: string[]
          main_goal?: string | null
          mixed_doubles?: boolean | null
          nationality?: string | null
          no_show_count?: number
          onboarding_stage?: string
          other_sports?: string[]
          padel_style?: string[]
          partner_interested_in?: string[]
          personal_traits?: string[]
          photo_moderation_reason?: string | null
          photo_moderation_status?: string
          photo_url?: string | null
          play_frequency?: string | null
          played_count?: number
          priorities?: string[]
          sexual_orientation?: string | null
          story_hook_en?: string | null
          story_hook_es?: string | null
          story_hook_fr?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
          world_mode?: boolean | null
          zone?: string | null
        }
        Relationships: []
      }
      push_outbox: {
        Row: {
          body: string | null
          created_at: string
          id: number
          profile_id: string
          sent_at: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          profile_id: string
          sent_at?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          profile_id?: string
          sent_at?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_answers: {
        Row: {
          answer: string
          answer_embedding: string | null
          answer_norm: string
          category: string
          created_at: string
          id: string
          profile_id: string
          question: string
        }
        Insert: {
          answer: string
          answer_embedding?: string | null
          answer_norm: string
          category?: string
          created_at?: string
          id?: string
          profile_id: string
          question: string
        }
        Update: {
          answer?: string
          answer_embedding?: string | null
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
          category: string | null
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
          category?: string | null
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
          category?: string | null
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
      short_links: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          target_url: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          target_url: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          target_url?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      venues: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          normalized_name: string
          updated_at: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          normalized_name: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          normalized_name?: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_intro: {
        Args: { _acting_user_id: string; _match_id: string }
        Returns: undefined
      }
      admin_clear_profile_photo: {
        Args: { _profile_id: string }
        Returns: Json
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_resolve_report: {
        Args: { _report_id: string; _status: string }
        Returns: Json
      }
      admin_set_suspended: {
        Args: { _profile_id: string; _suspend: boolean }
        Returns: Json
      }
      claim_push_outbox: { Args: { _limit?: number }; Returns: Json }
      cleanup_relationship_with: {
        Args: { _other: string }
        Returns: undefined
      }
      clear_my_compat_scores: { Args: never; Returns: undefined }
      coach_stats: { Args: { _coach_profile_id: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_expired_push_subs: {
        Args: { _endpoints: string[] }
        Returns: undefined
      }
      delete_match_thread: { Args: { _match_id: string }; Returns: undefined }
      delete_my_account_data: { Args: never; Returns: undefined }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_notification: {
        Args: {
          _body: string
          _pref_column: string
          _profile_id: string
          _title: string
          _type: string
          _url: string
        }
        Returns: undefined
      }
      fanout_match_alerts: {
        Args: { _match_id: string; _reason: string }
        Returns: undefined
      }
      get_pair_qa: { Args: { _other: string }; Returns: Json }
      get_player_count: { Args: never; Returns: number }
      get_profiles_minimal: { Args: { _ids: string[] }; Returns: Json }
      get_signup_ordinal: { Args: { _user_id: string }; Returns: number }
      guest_get_room: {
        Args: { _event_id: string; _token: string }
        Returns: Json
      }
      guest_join_match: {
        Args: {
          _display_name: string
          _event_id: string
          _level: string
          _phone: string
        }
        Returns: Json
      }
      guest_leave_match: {
        Args: { _event_id: string; _token: string }
        Returns: undefined
      }
      guest_send_message: {
        Args: { _body: string; _event_id: string; _token: string }
        Returns: string
      }
      handle_report: {
        Args: { _category?: string; _reason: string; _reported: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ignore_intro: {
        Args: { _acting_user_id: string; _match_id: string }
        Returns: undefined
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      list_my_favorite_ids: { Args: never; Returns: string[] }
      list_public_upcoming_matches: { Args: { _limit?: number }; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_profile_id: { Args: never; Returns: string }
      open_coach_chat: {
        Args: { _acting_user_id: string; _coach_profile_id: string }
        Returns: string
      }
      open_intro_chat: {
        Args: {
          _acting_user_id: string
          _body: string
          _target_profile_id: string
        }
        Returns: string
      }
      padel_level_rank: { Args: { lvl: string }; Returns: number }
      public_match_view: { Args: { _event_id: string }; Returns: Json }
      qa_affinity_scores: {
        Args: { _ids: string[]; _me_id: string }
        Returns: {
          profile_id: string
          q_close: number
          q_same: number
          q_shared: number
          qa_bonus: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      respond_to_intro: {
        Args: { _accept: boolean; _match_id: string }
        Returns: undefined
      }
      send_intro_message: {
        Args: { _body: string; _target_profile_id: string }
        Returns: string
      }
      shared_venues: { Args: { _a: string; _b: string }; Returns: Json }
      transfer_match_host: {
        Args: { _event: string; _new_host_profile_id: string }
        Returns: undefined
      }
      upsert_compat_score: {
        Args: {
          _blurb: string
          _friction: string
          _other: string
          _reasons: Json
          _score: number
          _sub: Json
          _version: string
        }
        Returns: undefined
      }
      venue_overlap_for_me: { Args: { _profile_ids: string[] }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      connect_category:
        | "traveling"
        | "selling"
        | "looking_to_play"
        | "question"
        | "news"
        | "other"
        | "looking_for_coach"
      friendship_status: "pending" | "accepted"
      match_event_status: "open" | "full" | "cancelled" | "played"
      match_gender_rule: "mixed" | "men_only" | "women_only"
      match_invite_status: "pending" | "accepted" | "declined" | "revoked"
      venue_type: "club" | "compound" | "public_court" | "other"
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
      connect_category: [
        "traveling",
        "selling",
        "looking_to_play",
        "question",
        "news",
        "other",
        "looking_for_coach",
      ],
      friendship_status: ["pending", "accepted"],
      match_event_status: ["open", "full", "cancelled", "played"],
      match_gender_rule: ["mixed", "men_only", "women_only"],
      match_invite_status: ["pending", "accepted", "declined", "revoked"],
      venue_type: ["club", "compound", "public_court", "other"],
    },
  },
} as const
