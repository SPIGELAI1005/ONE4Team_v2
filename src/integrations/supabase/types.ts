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
      achievements: {
        Row: {
          badge_icon: string
          badge_name: string
          badge_type: string
          club_id: string
          earned_at: string
          id: string
          membership_id: string
        }
        Insert: {
          badge_icon?: string
          badge_name: string
          badge_type: string
          club_id: string
          earned_at?: string
          id?: string
          membership_id: string
        }
        Update: {
          badge_icon?: string
          badge_name?: string
          badge_type?: string
          club_id?: string
          earned_at?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          starts_at: string
          team_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at: string
          team_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at?: string
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          club_id: string
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          club_id: string
          content: string
          created_at: string
          id: string
          priority: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          club_id: string
          content: string
          created_at?: string
          id?: string
          priority?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          priority?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      club_memberships: {
        Row: {
          age_group: string | null
          club_id: string
          created_at: string
          id: string
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          team: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string | null
          club_id: string
          created_at?: string
          id?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string | null
          club_id?: string
          created_at?: string
          id?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_member_drafts: {
        Row: {
          id: string
          club_id: string
          name: string | null
          email: string
          role: Database["public"]["Enums"]["app_role"]
          team: string | null
          age_group: string | null
          position: string | null
          status: string
          invite_id: string | null
          invited_at: string | null
          created_by: string
          created_at: string
          updated_at: string
          master_data: Json
        }
        Insert: {
          id?: string
          club_id: string
          name?: string | null
          email: string
          role?: Database["public"]["Enums"]["app_role"]
          team?: string | null
          age_group?: string | null
          position?: string | null
          status?: string
          invite_id?: string | null
          invited_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          master_data?: Json
        }
        Update: {
          id?: string
          club_id?: string
          name?: string | null
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          team?: string | null
          age_group?: string | null
          position?: string | null
          status?: string
          invite_id?: string | null
          invited_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          master_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "club_member_drafts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_llm_settings: {
        Row: {
          api_key: string
          azure_api_version: string | null
          azure_endpoint: string | null
          club_id: string
          created_at: string
          model: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_key: string
          azure_api_version?: string | null
          azure_endpoint?: string | null
          club_id: string
          created_at?: string
          model?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          azure_api_version?: string | null
          azure_endpoint?: string | null
          club_id?: string
          created_at?: string
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_llm_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_role_assignments: {
        Row: {
          id: string
          club_id: string
          membership_id: string
          role_kind: string
          scope: Database["public"]["Enums"]["club_role_scope"]
          scope_team_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          membership_id: string
          role_kind: string
          scope: Database["public"]["Enums"]["club_role_scope"]
          scope_team_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          membership_id?: string
          role_kind?: string
          scope?: Database["public"]["Enums"]["club_role_scope"]
          scope_team_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          address: string | null
          cover_image_url: string | null
          created_at: string
          default_language: string
          description: string | null
          email: string | null
          facebook_url: string | null
          favicon_url: string | null
          id: string
          instagram_url: string | null
          is_public: boolean
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          phone: string | null
          primary_color: string | null
          public_page_sections: Json
          reference_images: Json
          season_start_month: number
          secondary_color: string | null
          slug: string
          support_color: string | null
          tertiary_color: string | null
          timezone: string
          twitter_url: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_language?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          public_page_sections?: Json
          reference_images?: Json
          season_start_month?: number
          secondary_color?: string | null
          slug: string
          support_color?: string | null
          tertiary_color?: string | null
          timezone?: string
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string
          default_language?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          public_page_sections?: Json
          reference_images?: Json
          season_start_month?: number
          secondary_color?: string | null
          slug?: string
          support_color?: string | null
          tertiary_color?: string | null
          timezone?: string
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      club_pitches: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          display_color: string | null
          element_type: string
          grid_cells: Json
          id: string
          layer_id: string | null
          name: string
          notes: string | null
          parent_pitch_id: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          display_color?: string | null
          element_type?: string
          grid_cells?: Json
          id?: string
          layer_id?: string | null
          name: string
          notes?: string | null
          parent_pitch_id?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          display_color?: string | null
          element_type?: string
          grid_cells?: Json
          id?: string
          layer_id?: string | null
          name?: string
          notes?: string | null
          parent_pitch_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_pitches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_pitches_parent_pitch_id_fkey"
            columns: ["parent_pitch_id"]
            isOneToOne: false
            referencedRelation: "club_pitches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_pitches_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "club_property_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      club_property_layers: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          purpose: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          purpose?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          purpose?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_property_layers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_training_change_history: {
        Row: {
          action: string
          club_id: string
          created_at: string
          created_by: string | null
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          scope: string
        }
        Insert: {
          action: string
          club_id: string
          created_at?: string
          created_by?: string | null
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          scope: string
        }
        Update: {
          action?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_training_change_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          club_id: string
          competition_type: string
          created_at: string
          id: string
          name: string
          season: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          competition_type?: string
          created_at?: string
          id?: string
          name: string
          season?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          competition_type?: string
          created_at?: string
          id?: string
          name?: string
          season?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_stat_definitions: {
        Row: {
          club_id: string
          created_at: string
          id: string
          sport: string
          stat_category: string
          stat_icon: string | null
          stat_name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          sport?: string
          stat_category?: string
          stat_icon?: string | null
          stat_name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          sport?: string
          stat_category?: string
          stat_icon?: string | null
          stat_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_stat_definitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          membership_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          membership_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          membership_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          location: string | null
          max_participants: number | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          location?: string | null
          max_participants?: number | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          location?: string | null
          max_participants?: number | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          match_id: string
          membership_id: string | null
          minute: number | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          match_id: string
          membership_id?: string | null
          minute?: number | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          match_id?: string
          membership_id?: string | null
          minute?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          created_at: string
          id: string
          is_starter: boolean
          jersey_number: number | null
          match_id: string
          membership_id: string
          position: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_starter?: boolean
          jersey_number?: number | null
          match_id: string
          membership_id: string
          position?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_starter?: boolean
          jersey_number?: number | null
          match_id?: string
          membership_id?: string
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      match_votes: {
        Row: {
          club_id: string
          created_at: string
          id: string
          match_id: string
          voted_for_membership_id: string
          voter_membership_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          match_id: string
          voted_for_membership_id: string
          voter_membership_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          match_id?: string
          voted_for_membership_id?: string
          voter_membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_votes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_voted_for_membership_id_fkey"
            columns: ["voted_for_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_votes_voter_membership_id_fkey"
            columns: ["voter_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          club_id: string
          competition_id: string | null
          created_at: string
          home_score: number | null
          id: string
          is_home: boolean
          location: string | null
          match_date: string
          notes: string | null
          opponent: string
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          club_id: string
          competition_id?: string | null
          created_at?: string
          home_score?: number | null
          id?: string
          is_home?: boolean
          location?: string | null
          match_date: string
          notes?: string | null
          opponent: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          club_id?: string
          competition_id?: string | null
          created_at?: string
          home_score?: number | null
          id?: string
          is_home?: boolean
          location?: string | null
          match_date?: string
          notes?: string | null
          opponent?: string
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_dues: {
        Row: {
          amount_cents: number | null
          club_id: string
          created_at: string
          currency: string | null
          due_date: string
          id: string
          membership_id: string
          note: string | null
          paid_at: string | null
          status: string
        }
        Insert: {
          amount_cents?: number | null
          club_id: string
          created_at?: string
          currency?: string | null
          due_date: string
          id?: string
          membership_id: string
          note?: string | null
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number | null
          club_id?: string
          created_at?: string
          currency?: string | null
          due_date?: string
          id?: string
          membership_id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_dues_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_dues_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_fee_types: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          interval: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          amount: number
          club_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_fee_types_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          club_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
          team_id: string | null
        }
        Insert: {
          attachments?: Json
          club_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
          team_id?: string | null
        }
        Update: {
          attachments?: Json
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          club_id: string
          created_at: string
          id: string
          is_read: boolean
          notification_type: string
          reference_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          club_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          reference_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          club_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          reference_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          currency: string | null
          due_date: string
          fee_type_id: string | null
          id: string
          membership_id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          club_id: string
          created_at?: string
          currency?: string | null
          due_date: string
          fee_type_id?: string | null
          id?: string
          membership_id: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          currency?: string | null
          due_date?: string
          fee_type_id?: string | null
          id?: string
          membership_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "membership_fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_bookings: {
        Row: {
          booking_type: string
          club_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          needs_reconfirmation: boolean
          overridden_by_booking_id: string | null
          pitch_id: string
          reconfirmation_requested_at: string | null
          reconfirmation_status: string
          starts_at: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          booking_type?: string
          club_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          needs_reconfirmation?: boolean
          overridden_by_booking_id?: string | null
          pitch_id: string
          reconfirmation_requested_at?: string | null
          reconfirmation_status?: string
          starts_at: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          booking_type?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          needs_reconfirmation?: boolean
          overridden_by_booking_id?: string | null
          pitch_id?: string
          reconfirmation_requested_at?: string | null
          reconfirmation_status?: string
          starts_at?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_bookings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_bookings_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "club_pitches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_bookings_overridden_by_booking_id_fkey"
            columns: ["overridden_by_booking_id"]
            isOneToOne: false
            referencedRelation: "pitch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stats: {
        Row: {
          club_id: string
          created_at: string
          id: string
          match_id: string
          membership_id: string
          stat_name: string
          stat_value: number
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          match_id: string
          membership_id: string
          stat_name: string
          stat_value?: number
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          match_id?: string
          membership_id?: string
          stat_name?: string
          stat_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      season_awards: {
        Row: {
          award_icon: string | null
          award_name: string
          award_type: string
          club_id: string
          created_at: string
          id: string
          membership_id: string
          season: string
        }
        Insert: {
          award_icon?: string | null
          award_name: string
          award_type: string
          club_id: string
          created_at?: string
          id?: string
          membership_id: string
          season: string
        }
        Update: {
          award_icon?: string | null
          award_name?: string
          award_type?: string
          club_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          season?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_awards_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          created_at: string
          id: string
          jersey_number: number | null
          membership_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          membership_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          membership_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_coaches: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coaches_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_group: string | null
          club_id: string
          coach_name: string | null
          created_at: string
          id: string
          league: string | null
          name: string
          sport: string | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          club_id: string
          coach_name?: string | null
          created_at?: string
          id?: string
          league?: string | null
          name: string
          sport?: string | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          club_id?: string
          coach_name?: string | null
          created_at?: string
          id?: string
          league?: string | null
          name?: string
          sport?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          location: string | null
          recurring: string | null
          starts_at: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          location?: string | null
          recurring?: string | null
          starts_at: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          location?: string | null
          recurring?: string | null
          starts_at?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_club_member_audit_event: {
        Args: {
          _club_id: string
          _correlation_email?: string | null
          _detail?: Json
          _draft_id?: string | null
          _event_type: string
          _membership_id?: string | null
          _summary?: string | null
        }
        Returns: string
      }
      create_club_with_admin: {
        Args: {
          _description?: string
          _is_public?: boolean
          _name: string
          _slug: string
        }
        Returns: string
      }
      get_club_member_audit_timeline: {
        Args: { _club_id: string; _membership_id: string }
        Returns: {
          actor_user_id: string | null
          correlation_email: string | null
          created_at: string
          detail: Json
          event_type: string
          id: string
          membership_id: string | null
          summary: string | null
        }[]
      }
      get_club_member_audit_timeline_for_draft: {
        Args: { _club_id: string; _draft_id: string }
        Returns: {
          actor_user_id: string | null
          correlation_email: string | null
          created_at: string
          detail: Json
          event_type: string
          id: string
          membership_id: string | null
          summary: string | null
        }[]
      }
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      list_club_membership_emails: {
        Args: { _club_id: string }
        Returns: { membership_id: string; email: string }[]
      }
      is_member_of_club: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "trainer"
        | "player"
        | "staff"
        | "member"
        | "parent"
        | "sponsor"
        | "supplier"
        | "service_provider"
        | "consultant"
      club_role_scope: "club" | "team" | "self"
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
      app_role: [
        "admin",
        "trainer",
        "player",
        "staff",
        "member",
        "parent",
        "sponsor",
        "supplier",
        "service_provider",
        "consultant",
      ],
      club_role_scope: ["club", "team", "self"],
    },
  },
} as const
