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
      abuse_alerts: {
        Row: {
          action: string
          blocked_count: number
          club_id: string
          created_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          status: string
          total_count: number
          updated_at: string
        }
        Insert: {
          action: string
          blocked_count?: number
          club_id: string
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          action?: string
          blocked_count?: number
          club_id?: string
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_alerts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      abuse_escalation_policies: {
        Row: {
          auto_resolve_after_minutes: number | null
          club_id: string
          cooldown_minutes: number
          created_at: string
          created_by: string
          id: string
          min_blocked_attempts: number
          min_unique_identifiers: number
          notify_enabled: boolean
          severity: string
          updated_at: string
        }
        Insert: {
          auto_resolve_after_minutes?: number | null
          club_id: string
          cooldown_minutes?: number
          created_at?: string
          created_by?: string
          id?: string
          min_blocked_attempts?: number
          min_unique_identifiers?: number
          notify_enabled?: boolean
          severity: string
          updated_at?: string
        }
        Update: {
          auto_resolve_after_minutes?: number | null
          club_id?: string
          cooldown_minutes?: number
          created_at?: string
          created_by?: string
          id?: string
          min_blocked_attempts?: number
          min_unique_identifiers?: number
          notify_enabled?: boolean
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_escalation_policies_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      abuse_notification_endpoints: {
        Row: {
          channel: string
          club_id: string
          created_at: string
          created_by: string
          endpoint_url: string | null
          id: string
          is_active: boolean
          recipient_email: string | null
          secret_token: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          club_id: string
          created_at?: string
          created_by?: string
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          recipient_email?: string | null
          secret_token?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          club_id?: string
          created_at?: string
          created_by?: string
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          recipient_email?: string | null
          secret_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_notification_endpoints_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      abuse_notification_events: {
        Row: {
          alert_id: string | null
          attempt_count: number
          club_id: string
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          id: string
          last_error: string | null
          payload: Json
          status: string
        }
        Insert: {
          alert_id?: string | null
          attempt_count?: number
          club_id: string
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          id?: string
          last_error?: string | null
          payload?: Json
          status?: string
        }
        Update: {
          alert_id?: string | null
          attempt_count?: number
          club_id?: string
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          id?: string
          last_error?: string | null
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_notification_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "abuse_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_notification_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_notification_events_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "abuse_notification_endpoints"
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
          import_key: string | null
          location: string | null
          pitch_booking_id: string | null
          publish_to_public_schedule: boolean
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
          import_key?: string | null
          location?: string | null
          pitch_booking_id?: string | null
          publish_to_public_schedule?: boolean
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
          import_key?: string | null
          location?: string | null
          pitch_booking_id?: string | null
          publish_to_public_schedule?: boolean
          starts_at?: string
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_pitch_booking_id_fkey"
            columns: ["pitch_booking_id"]
            isOneToOne: false
            referencedRelation: "pitch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_attendance: {
        Row: {
          activity_id: string
          club_id: string
          created_at: string
          id: string
          membership_id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          club_id: string
          created_at?: string
          id?: string
          membership_id: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          club_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_attendance_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attendance_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attendance_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_runs: {
        Row: {
          club_id: string
          confirmed_at: string | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          execution_result: Json | null
          expires_at: string | null
          id: string
          idempotency_key: string | null
          intent: string
          page_context: Json
          proposal: Json
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          execution_result?: Json | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          intent: string
          page_context?: Json
          proposal?: Json
          status: string
          user_id: string
        }
        Update: {
          club_id?: string
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          execution_result?: Json | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          intent?: string
          page_context?: Json
          proposal?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_runs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      ai_requests: {
        Row: {
          club_id: string
          created_at: string
          id: string
          input: Json
          kind: string
          model: string | null
          output: Json
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          input?: Json
          kind: string
          model?: string | null
          output?: Json
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          input?: Json
          kind?: string
          model?: string | null
          output?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_club_id_fkey"
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
          excerpt: string | null
          id: string
          image_url: string | null
          priority: string | null
          public_news_category: string
          publish_to_public_website: boolean
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          club_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          priority?: string | null
          public_news_category?: string
          publish_to_public_website?: boolean
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          club_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          priority?: string | null
          public_news_category?: string
          publish_to_public_website?: boolean
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
      automation_rules: {
        Row: {
          club_id: string
          config: Json
          created_at: string
          created_by: string
          id: string
          is_enabled: boolean
          last_run_at: string | null
          rule_type: string
          schedule_cron: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          rule_type: string
          schedule_cron?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          rule_type?: string
          schedule_cron?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          club_id: string
          error_message: string | null
          finished_at: string | null
          id: string
          result: Json
          rule_id: string | null
          run_status: string
          run_type: string
          started_at: string
        }
        Insert: {
          club_id: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          result?: Json
          rule_id?: string | null
          run_status?: string
          run_type: string
          started_at?: string
        }
        Update: {
          club_id?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          result?: Json
          rule_id?: string | null
          run_status?: string
          run_type?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          club_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          source: string
          stripe_event_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          source?: string
          stripe_event_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          source?: string
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          club_id: string
          created_at: string
          created_by: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          cancel_at_period_end?: boolean
          club_id: string
          created_at?: string
          created_by?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          club_id?: string
          created_at?: string
          created_by?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_bridge_connectors: {
        Row: {
          bridge_user_id: string | null
          club_id: string
          config: Json
          created_at: string
          created_by: string
          display_name: string | null
          external_channel_id: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          provider: string
          status: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          bridge_user_id?: string | null
          club_id: string
          config?: Json
          created_at?: string
          created_by: string
          display_name?: string | null
          external_channel_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider: string
          status?: string
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          bridge_user_id?: string | null
          club_id?: string
          config?: Json
          created_at?: string
          created_by?: string
          display_name?: string | null
          external_channel_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_bridge_connectors_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_bridge_events: {
        Row: {
          club_id: string
          connector_id: string
          created_at: string
          direction: string
          error_message: string | null
          id: string
          message_payload: Json
          processed_at: string | null
          provider_message_id: string | null
          status: string
          team_id: string | null
        }
        Insert: {
          club_id: string
          connector_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          message_payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          status?: string
          team_id?: string | null
        }
        Update: {
          club_id?: string
          connector_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          message_payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          status?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_bridge_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_bridge_events_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "chat_bridge_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_bridge_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      club_expenses: {
        Row: {
          amount_cents: number
          category: string
          club_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category?: string
          club_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_expenses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_feature_trials: {
        Row: {
          club_id: string
          created_at: string
          expires_at: string
          feature: string
          note: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          expires_at: string
          feature: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          expires_at?: string
          feature?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_feature_trials_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invite_requests: {
        Row: {
          application_payload: Json | null
          club_id: string
          consent_at: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          interested_role: string | null
          interested_team: string | null
          internal_note: string | null
          last_name: string | null
          message: string | null
          name: string
          phone: string | null
          request_user_id: string | null
          source: string | null
          status: string
        }
        Insert: {
          application_payload?: Json | null
          club_id: string
          consent_at?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          interested_role?: string | null
          interested_team?: string | null
          internal_note?: string | null
          last_name?: string | null
          message?: string | null
          name: string
          phone?: string | null
          request_user_id?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          application_payload?: Json | null
          club_id?: string
          consent_at?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          interested_role?: string | null
          interested_team?: string | null
          internal_note?: string | null
          last_name?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          request_user_id?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invite_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invites: {
        Row: {
          club_id: string
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          invite_payload: Json
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string
          used_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_payload?: Json
          role?: Database["public"]["Enums"]["app_role"]
          token_hash: string
          used_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_payload?: Json
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_invites_club_id_fkey"
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
          club_ai_instructions: string | null
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
          club_ai_instructions?: string | null
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
          club_ai_instructions?: string | null
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
      club_member_audit_events: {
        Row: {
          actor_user_id: string | null
          club_id: string
          correlation_email: string | null
          created_at: string
          detail: Json
          draft_id: string | null
          event_type: string
          id: string
          membership_id: string | null
          summary: string | null
        }
        Insert: {
          actor_user_id?: string | null
          club_id: string
          correlation_email?: string | null
          created_at?: string
          detail?: Json
          draft_id?: string | null
          event_type: string
          id?: string
          membership_id?: string | null
          summary?: string | null
        }
        Update: {
          actor_user_id?: string | null
          club_id?: string
          correlation_email?: string | null
          created_at?: string
          detail?: Json
          draft_id?: string | null
          event_type?: string
          id?: string
          membership_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_member_audit_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_audit_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "club_member_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_audit_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      club_member_drafts: {
        Row: {
          age_group: string | null
          club_id: string
          created_at: string
          created_by: string
          email: string
          id: string
          invite_id: string | null
          invited_at: string | null
          master_data: Json
          name: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          team: string | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          club_id: string
          created_at?: string
          created_by?: string
          email: string
          id?: string
          invite_id?: string | null
          invited_at?: string | null
          master_data?: Json
          name?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team?: string | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          club_id?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          invite_id?: string | null
          invited_at?: string | null
          master_data?: Json
          name?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_member_drafts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_drafts_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "club_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      club_member_guardian_links: {
        Row: {
          club_id: string
          created_at: string
          guardian_membership_id: string
          id: string
          relationship: string | null
          ward_membership_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          guardian_membership_id: string
          id?: string
          relationship?: string | null
          ward_membership_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          guardian_membership_id?: string
          id?: string
          relationship?: string | null
          ward_membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_member_guardian_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_guardian_links_guardian_membership_id_fkey"
            columns: ["guardian_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_guardian_links_ward_membership_id_fkey"
            columns: ["ward_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      club_member_master_records: {
        Row: {
          address_line2: string | null
          allergies: string | null
          bank_account_holder: string | null
          bank_name: string | null
          birth_date: string | null
          city: string | null
          club_exit_date: string | null
          club_id: string
          club_pass_generated_at: string | null
          club_registration_date: string | null
          country: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          goals_count: number | null
          height_cm: number | null
          iban: string | null
          internal_club_number: string | null
          invoice_reference: string | null
          jersey_number: number | null
          last_evaluation_date: string | null
          last_name: string | null
          medical_conditions: string | null
          medical_notes: string | null
          medications: string | null
          membership_id: string
          membership_kind: string
          nationality: string | null
          onboarding_progress: string | null
          photo_url: string | null
          player_passport_number: string | null
          postal_code: string | null
          role_development_notes: string | null
          sex: string | null
          shirt_size: string | null
          shoe_size: string | null
          squad_status: string | null
          street_line: string | null
          strengths: string | null
          strong_hand: string | null
          strong_leg: string | null
          team_assignment_date: string | null
          team_integration_status: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          address_line2?: string | null
          allergies?: string | null
          bank_account_holder?: string | null
          bank_name?: string | null
          birth_date?: string | null
          city?: string | null
          club_exit_date?: string | null
          club_id: string
          club_pass_generated_at?: string | null
          club_registration_date?: string | null
          country?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          goals_count?: number | null
          height_cm?: number | null
          iban?: string | null
          internal_club_number?: string | null
          invoice_reference?: string | null
          jersey_number?: number | null
          last_evaluation_date?: string | null
          last_name?: string | null
          medical_conditions?: string | null
          medical_notes?: string | null
          medications?: string | null
          membership_id: string
          membership_kind?: string
          nationality?: string | null
          onboarding_progress?: string | null
          photo_url?: string | null
          player_passport_number?: string | null
          postal_code?: string | null
          role_development_notes?: string | null
          sex?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          squad_status?: string | null
          street_line?: string | null
          strengths?: string | null
          strong_hand?: string | null
          strong_leg?: string | null
          team_assignment_date?: string | null
          team_integration_status?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          address_line2?: string | null
          allergies?: string | null
          bank_account_holder?: string | null
          bank_name?: string | null
          birth_date?: string | null
          city?: string | null
          club_exit_date?: string | null
          club_id?: string
          club_pass_generated_at?: string | null
          club_registration_date?: string | null
          country?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          goals_count?: number | null
          height_cm?: number | null
          iban?: string | null
          internal_club_number?: string | null
          invoice_reference?: string | null
          jersey_number?: number | null
          last_evaluation_date?: string | null
          last_name?: string | null
          medical_conditions?: string | null
          medical_notes?: string | null
          medications?: string | null
          membership_id?: string
          membership_kind?: string
          nationality?: string | null
          onboarding_progress?: string | null
          photo_url?: string | null
          player_passport_number?: string | null
          postal_code?: string | null
          role_development_notes?: string | null
          sex?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          squad_status?: string | null
          street_line?: string | null
          strengths?: string | null
          strong_hand?: string | null
          strong_leg?: string | null
          team_assignment_date?: string | null
          team_integration_status?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "club_member_master_records_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_master_records_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "club_memberships"
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
      club_person_placeholders: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          kind: string
          notes: string | null
          resolved_membership_id: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          kind: string
          notes?: string | null
          resolved_membership_id?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          kind?: string
          notes?: string | null
          resolved_membership_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_person_placeholders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_person_placeholders_resolved_membership_id_fkey"
            columns: ["resolved_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "club_pitches_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "club_property_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_pitches_parent_pitch_id_fkey"
            columns: ["parent_pitch_id"]
            isOneToOne: false
            referencedRelation: "club_pitches"
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
      club_public_contact_persons: {
        Row: {
          club_id: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          phone: string | null
          role_title: string | null
          show_on_public_website: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          phone?: string | null
          role_title?: string | null
          show_on_public_website?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          phone?: string | null
          role_title?: string | null
          show_on_public_website?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_public_contact_persons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_public_documents: {
        Row: {
          category: string
          club_id: string
          contains_personal_data: boolean
          created_at: string
          description: string | null
          file_url: string
          id: string
          is_public: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          club_id: string
          contains_personal_data?: boolean
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          is_public?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          club_id?: string
          contains_personal_data?: boolean
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          is_public?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_public_documents_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_public_faq_items: {
        Row: {
          answer: string
          club_id: string
          created_at: string
          id: string
          is_public: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          club_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          club_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_public_faq_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_public_page_drafts: {
        Row: {
          club_id: string
          config: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          club_id: string
          config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          club_id?: string
          config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_public_page_drafts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_role_assignments: {
        Row: {
          club_id: string
          created_at: string
          id: string
          membership_id: string
          role_kind: string
          scope: Database["public"]["Enums"]["club_role_scope"]
          scope_team_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          membership_id: string
          role_kind: string
          scope: Database["public"]["Enums"]["club_role_scope"]
          scope_team_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          role_kind?: string
          scope?: Database["public"]["Enums"]["club_role_scope"]
          scope_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_role_assignments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_role_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_role_assignments_scope_team_id_fkey"
            columns: ["scope_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      club_sports: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          sport_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          sport_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_sports_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      club_tasks: {
        Row: {
          assignee_user_id: string | null
          club_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          partner_id: string | null
          priority: string
          source_id: string | null
          source_type: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_user_id?: string | null
          club_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          partner_id?: string | null
          priority?: string
          source_id?: string | null
          source_type?: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string | null
          club_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          partner_id?: string | null
          priority?: string
          source_id?: string | null
          source_type?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      clubs: {
        Row: {
          address: string | null
          club_category: string | null
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
          join_approval_mode: string
          join_auto_approve_invited_only: boolean
          join_default_role: Database["public"]["Enums"]["app_role"]
          join_default_team: string | null
          join_reviewer_policy: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          og_image_url: string | null
          phone: string | null
          primary_color: string | null
          public_location_notes: string | null
          public_page_publish_version: number
          public_page_published_at: string | null
          public_page_published_by: string | null
          public_page_published_config: Json | null
          public_page_sections: Json
          public_seo_allow_indexing: boolean
          public_seo_structured_data: boolean
          reference_images: Json
          season_start_month: number
          secondary_color: string | null
          slug: string
          support_color: string | null
          tertiary_color: string | null
          tiktok_url: string | null
          timezone: string
          twitter_url: string | null
          updated_at: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          club_category?: string | null
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
          join_approval_mode?: string
          join_auto_approve_invited_only?: boolean
          join_default_role?: Database["public"]["Enums"]["app_role"]
          join_default_team?: string | null
          join_reviewer_policy?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          og_image_url?: string | null
          phone?: string | null
          primary_color?: string | null
          public_location_notes?: string | null
          public_page_publish_version?: number
          public_page_published_at?: string | null
          public_page_published_by?: string | null
          public_page_published_config?: Json | null
          public_page_sections?: Json
          public_seo_allow_indexing?: boolean
          public_seo_structured_data?: boolean
          reference_images?: Json
          season_start_month?: number
          secondary_color?: string | null
          slug: string
          support_color?: string | null
          tertiary_color?: string | null
          tiktok_url?: string | null
          timezone?: string
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          club_category?: string | null
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
          join_approval_mode?: string
          join_auto_approve_invited_only?: boolean
          join_default_role?: Database["public"]["Enums"]["app_role"]
          join_default_team?: string | null
          join_reviewer_policy?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          og_image_url?: string | null
          phone?: string | null
          primary_color?: string | null
          public_location_notes?: string | null
          public_page_publish_version?: number
          public_page_published_at?: string | null
          public_page_published_by?: string | null
          public_page_published_config?: Json | null
          public_page_sections?: Json
          public_seo_allow_indexing?: boolean
          public_seo_structured_data?: boolean
          reference_images?: Json
          season_start_month?: number
          secondary_color?: string | null
          slug?: string
          support_color?: string | null
          tertiary_color?: string | null
          tiktok_url?: string | null
          timezone?: string
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
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
      edge_llm_minute_buckets: {
        Row: {
          club_id: string
          cnt: number
          user_id: string
          window_minute: string
        }
        Insert: {
          club_id: string
          cnt?: number
          user_id: string
          window_minute: string
        }
        Update: {
          club_id?: string
          cnt?: number
          user_id?: string
          window_minute?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          club_id: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          image_url: string | null
          import_key: string | null
          location: string | null
          max_participants: number | null
          partner_name: string | null
          public_event_detail_enabled: boolean
          public_registration_enabled: boolean
          public_summary: string | null
          publish_to_public_schedule: boolean
          registration_external_url: string | null
          starts_at: string
          target_audience: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          import_key?: string | null
          location?: string | null
          max_participants?: number | null
          partner_name?: string | null
          public_event_detail_enabled?: boolean
          public_registration_enabled?: boolean
          public_summary?: string | null
          publish_to_public_schedule?: boolean
          registration_external_url?: string | null
          starts_at: string
          target_audience?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          import_key?: string | null
          location?: string | null
          max_participants?: number | null
          partner_name?: string | null
          public_event_detail_enabled?: boolean
          public_registration_enabled?: boolean
          public_summary?: string | null
          publish_to_public_schedule?: boolean
          registration_external_url?: string | null
          starts_at?: string
          target_audience?: string | null
          team_id?: string | null
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
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          opponent_logo_url: string | null
          public_match_detail_enabled: boolean
          publish_to_public_schedule: boolean
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
          opponent_logo_url?: string | null
          public_match_detail_enabled?: boolean
          publish_to_public_schedule?: boolean
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
          opponent_logo_url?: string | null
          public_match_detail_enabled?: boolean
          publish_to_public_schedule?: boolean
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          is_trainers_channel: boolean
          sender_id: string
          team_id: string | null
        }
        Insert: {
          attachments?: Json
          club_id: string
          content: string
          created_at?: string
          id?: string
          is_trainers_channel?: boolean
          sender_id: string
          team_id?: string | null
        }
        Update: {
          attachments?: Json
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          is_trainers_channel?: boolean
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
      partner_contracts: {
        Row: {
          club_id: string
          contract_status: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          notes: string | null
          partner_id: string
          renewal_date: string | null
          start_date: string | null
          terms: Json
          title: string
          updated_at: string
          value_eur: number | null
        }
        Insert: {
          club_id: string
          contract_status?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          renewal_date?: string | null
          start_date?: string | null
          terms?: Json
          title: string
          updated_at?: string
          value_eur?: number | null
        }
        Update: {
          club_id?: string
          contract_status?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          renewal_date?: string | null
          start_date?: string | null
          terms?: Json
          title?: string
          updated_at?: string
          value_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_contracts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contracts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          amount_eur: number
          club_id: string
          contract_id: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_no: string
          invoice_status: string
          metadata: Json
          paid_at: string | null
          partner_id: string
          updated_at: string
        }
        Insert: {
          amount_eur?: number
          club_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_no: string
          invoice_status?: string
          metadata?: Json
          paid_at?: string | null
          partner_id: string
          updated_at?: string
        }
        Update: {
          amount_eur?: number
          club_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_no?: string
          invoice_status?: string
          metadata?: Json
          paid_at?: string | null
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_tasks: {
        Row: {
          assigned_to_user_id: string | null
          club_id: string
          completed_at: string | null
          contract_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          partner_id: string
          priority: string
          task_status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          club_id: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          partner_id: string
          priority?: string
          task_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          club_id?: string
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          partner_id?: string
          priority?: string
          task_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          partner_type: string
          phone: string | null
          show_on_public_club_page: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          partner_type?: string
          phone?: string | null
          show_on_public_club_page?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          partner_type?: string
          phone?: string | null
          show_on_public_club_page?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_club_id_fkey"
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
          activity_id: string | null
          booking_type: string
          club_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          import_key: string | null
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
          activity_id?: string | null
          booking_type?: string
          club_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          import_key?: string | null
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
          activity_id?: string | null
          booking_type?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          import_key?: string | null
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
            foreignKeyName: "pitch_bookings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_bookings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
            foreignKeyName: "pitch_bookings_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "club_pitches"
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
      platform_admin_audit_events: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
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
      request_rate_limits: {
        Row: {
          action: string
          club_id: string
          created_at: string
          id: string
          identifier: string
          metadata: Json
        }
        Insert: {
          action: string
          club_id: string
          created_at?: string
          id?: string
          identifier: string
          metadata?: Json
        }
        Update: {
          action?: string
          club_id?: string
          created_at?: string
          id?: string
          identifier?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "request_rate_limits_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
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
      shop_categories: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          buyer_membership_id: string | null
          club_id: string
          created_by: string
          id: string
          ordered_at: string
          product_id: string
          quantity: number
          status: string
          total_eur: number
          updated_at: string
        }
        Insert: {
          buyer_membership_id?: string | null
          club_id: string
          created_by?: string
          id?: string
          ordered_at?: string
          product_id: string
          quantity?: number
          status?: string
          total_eur?: number
          updated_at?: string
        }
        Update: {
          buyer_membership_id?: string | null
          club_id?: string
          created_by?: string
          id?: string
          ordered_at?: string
          product_id?: string
          quantity?: number
          status?: string
          total_eur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_buyer_membership_id_fkey"
            columns: ["buyer_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category_id: string | null
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: Json
          is_active: boolean
          name: string
          price_eur: number
          stock: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          club_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json
          is_active?: boolean
          name: string
          price_eur?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json
          is_active?: boolean
          name?: string
          price_eur?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_stat_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          sort_order: number
          sport_id: string
          stat_category: string
          stat_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          sort_order?: number
          sport_id: string
          stat_category?: string
          stat_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          sort_order?: number
          sport_id?: string
          stat_category?: string
          stat_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_stat_templates_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_catalog: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      stripe_processed_events: {
        Row: {
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      team_coaches: {
        Row: {
          created_at: string
          id: string
          membership_id: string | null
          placeholder_id: string | null
          public_contact_email: string | null
          show_on_public_website: boolean
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id?: string | null
          placeholder_id?: string | null
          public_contact_email?: string | null
          show_on_public_website?: boolean
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string | null
          placeholder_id?: string | null
          public_contact_email?: string | null
          show_on_public_website?: boolean
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
            foreignKeyName: "team_coaches_placeholder_id_fkey"
            columns: ["placeholder_id"]
            isOneToOne: false
            referencedRelation: "club_person_placeholders"
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
      teams: {
        Row: {
          age_group: string | null
          club_id: string
          coach_name: string | null
          created_at: string
          id: string
          league: string | null
          name: string
          public_description: string | null
          public_document_links: Json
          public_documents_visible: boolean
          public_training_schedule_visible: boolean
          public_website_visible: boolean
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
          public_description?: string | null
          public_document_links?: Json
          public_documents_visible?: boolean
          public_training_schedule_visible?: boolean
          public_website_visible?: boolean
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
          public_description?: string | null
          public_document_links?: Json
          public_documents_visible?: boolean
          public_training_schedule_visible?: boolean
          public_website_visible?: boolean
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
          publish_to_public_schedule: boolean
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
          publish_to_public_schedule?: boolean
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
          publish_to_public_schedule?: boolean
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
      _notify_club_join_request_created: {
        Args: {
          p_applicant_label: string
          p_club_id: string
          p_request_id: string
        }
        Returns: undefined
      }
      agent_cancel_training: {
        Args: {
          _activity_id: string
          _club_id: string
          _reason?: string
          _user_id: string
        }
        Returns: Json
      }
      agent_create_member_draft: {
        Args: {
          _club_id: string
          _email: string
          _name?: string
          _position?: string
          _role?: string
          _team?: string
          _user_id: string
        }
        Returns: Json
      }
      agent_create_training: {
        Args: {
          _club_id: string
          _ends_at: string
          _location?: string
          _starts_at: string
          _team_id: string
          _title: string
          _user_id: string
        }
        Returns: Json
      }
      agent_duplicate_training_week_sessions: {
        Args: {
          _club_id: string
          _days_shift?: number
          _team_id?: string
          _user_id: string
        }
        Returns: Json
      }
      agent_send_club_announcement: {
        Args: {
          _club_id: string
          _content: string
          _priority?: string
          _title: string
          _user_id: string
        }
        Returns: Json
      }
      agent_validate_training_scope: {
        Args: { _activity_id: string; _club_id: string; _user_id: string }
        Returns: Json
      }
      append_club_member_audit_event: {
        Args: {
          _club_id: string
          _correlation_email: string
          _detail: Json
          _draft_id: string
          _event_type: string
          _membership_id: string
          _summary: string
        }
        Returns: string
      }
      apply_abuse_escalation_policy: {
        Args: {
          _blocked_attempts: number
          _club_id: string
          _severity: string
          _unique_identifiers: number
        }
        Returns: Json
      }
      approve_club_join_request: {
        Args: {
          _membership_role?: Database["public"]["Enums"]["app_role"]
          _membership_team?: string
          _request_id: string
        }
        Returns: {
          club_id: string
          outcome: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      can_access_team_message: {
        Args: {
          _club_id: string
          _is_trainers_channel: boolean
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_manage_team_training: {
        Args: { _club_id: string; _team_id: string; _user_id: string }
        Returns: boolean
      }
      can_review_club_join_requests: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      club_accepts_public_join_requests: {
        Args: { _club_id: string }
        Returns: boolean
      }
      club_plan_includes_shop: { Args: { _club_id: string }; Returns: boolean }
      club_public_has_feature: {
        Args: { p_club_id: string; p_feature: string }
        Returns: boolean
      }
      consume_edge_llm_quota: {
        Args: { _club_id: string; _max_per_minute?: number; _user_id: string }
        Returns: Json
      }
      create_club_with_admin:
        | {
            Args: {
              _description?: string
              _is_public?: boolean
              _name: string
              _slug: string
            }
            Returns: string
          }
        | {
            Args: {
              _description?: string
              _is_public?: boolean
              _metadata?: Json
              _name: string
              _plan_id?: string
              _slug: string
            }
            Returns: string
          }
      enforce_request_rate_limit: {
        Args: {
          _action: string
          _club_id: string
          _identifier: string
          _max_attempts: number
          _window: string
        }
        Returns: undefined
      }
      enqueue_automation_run: {
        Args: { _club_id: string; _payload?: Json; _rule_type: string }
        Returns: string
      }
      get_club_abuse_alerts: {
        Args: { _club_id: string; _limit?: number; _status?: string }
        Returns: {
          action: string
          blocked_count: number
          first_seen_at: string
          id: string
          last_seen_at: string
          reason: string
          resolution_note: string
          resolved_at: string
          severity: string
          status: string
          total_count: number
        }[]
      }
      get_club_ai_usage_stats: {
        Args: { _club_id: string; _from?: string; _to?: string }
        Returns: Json
      }
      get_club_member_audit_timeline: {
        Args: { _club_id: string; _membership_id: string }
        Returns: {
          actor_user_id: string
          correlation_email: string
          created_at: string
          detail: Json
          event_type: string
          id: string
          membership_id: string
          summary: string
        }[]
      }
      get_club_member_audit_timeline_for_draft: {
        Args: { _club_id: string; _draft_id: string }
        Returns: {
          actor_user_id: string
          correlation_email: string
          created_at: string
          detail: Json
          event_type: string
          id: string
          membership_id: string
          summary: string
        }[]
      }
      get_club_member_stats: {
        Args: { _club_id: string }
        Returns: {
          active_count: number
          player_count: number
          total_count: number
          trainer_count: number
        }[]
      }
      get_club_request_abuse_audit: {
        Args: { _club_id: string; _hours?: number }
        Returns: {
          action: string
          allowed_attempts: number
          blocked_attempts: number
          last_attempt_at: string
          total_attempts: number
          unique_devices: number
          unique_identifiers: number
        }[]
      }
      get_head_to_head_stats: {
        Args: {
          _club_id: string
          _max_matches?: number
          _membership_ids: string[]
        }
        Returns: {
          appearances: number
          assists: number
          cards: number
          goals: number
          membership_id: string
        }[]
      }
      get_membership_activity_heatmap:
        | {
            Args: { _club_id: string; _days?: number }
            Returns: {
              activity_count: number
              day_bucket: string
              display_name: string
              membership_id: string
            }[]
          }
        | {
            Args: { _club_id: string; _days?: number; _membership_id?: string }
            Returns: {
              activity_count: number
              day: string
            }[]
          }
      get_player_radar_stats: {
        Args: { _club_id: string; _membership_id: string }
        Returns: {
          appearances: number
          assists: number
          attendance_confirmed: number
          attendance_total: number
          completed_matches_count: number
          goals: number
          red_cards: number
          starts: number
          yellow_cards: number
        }[]
      }
      get_player_stats_aggregate: {
        Args: {
          _club_id: string
          _competition_id?: string
          _competition_ids?: string[]
          _team_id?: string
        }
        Returns: {
          assists: number
          display_name: string
          goals: number
          membership_id: string
          red_cards: number
          yellow_cards: number
        }[]
      }
      get_public_club_team_page: {
        Args: { _club_slug: string; _team_id: string }
        Returns: Json
      }
      get_season_award_winners: {
        Args: { _club_id: string }
        Returns: {
          completed_matches_count: number
          golden_boot_display_name: string
          golden_boot_goals: number
          golden_boot_membership_id: string
          playmaker_assists: number
          playmaker_display_name: string
          playmaker_membership_id: string
          reliable_appearances: number
          reliable_display_name: string
          reliable_membership_id: string
        }[]
      }
      get_team_chemistry_pairs: {
        Args: {
          _club_id: string
          _limit?: number
          _max_matches?: number
          _min_together?: number
        }
        Returns: {
          membership_id_1: string
          membership_id_2: string
          total: number
          win_rate: number
          wins: number
        }[]
      }
      get_team_trainers_for_agent: { Args: { _team_id: string }; Returns: Json }
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_admin_membership_legacy: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_trainer: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_member_of_club: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_team_admin_user: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_assigned_team_trainer: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      list_club_membership_emails: {
        Args: { _club_id: string }
        Returns: {
          email: string
          membership_id: string
        }[]
      }
      log_platform_admin_action: {
        Args: { _action: string; _payload?: Json }
        Returns: undefined
      }
      publish_club_public_page_config: {
        Args: { p_club_id: string }
        Returns: Json
      }
      queue_abuse_notifications: {
        Args: { _alert_id: string; _club_id: string; _payload?: Json }
        Returns: number
      }
      raise_abuse_alert: {
        Args: {
          _action: string
          _blocked_inc?: number
          _club_id: string
          _metadata?: Json
          _reason: string
          _severity: string
        }
        Returns: undefined
      }
      redeem_club_invite: {
        Args: { _token: string }
        Returns: {
          club_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      register_club_join_request: {
        Args: {
          _application_payload?: Json
          _club_id: string
          _consent?: boolean
          _first_name?: string
          _interested_role?: string
          _interested_team?: string
          _last_name?: string
          _message?: string
          _name: string
          _phone?: string
          _website_url?: string
        }
        Returns: {
          club_id: string
          outcome: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      request_club_invite: {
        Args: {
          _application_payload?: Json
          _club_id: string
          _consent?: boolean
          _email: string
          _first_name: string
          _interested_role?: string
          _interested_team?: string
          _last_name: string
          _message?: string
          _phone?: string
          _website_url?: string
        }
        Returns: string
      }
      resolve_club_abuse_alert: {
        Args: { _alert_id: string; _note?: string }
        Returns: undefined
      }
      resolve_club_member_emails_to_memberships: {
        Args: { _club_id: string; _emails: string[] }
        Returns: {
          email: string
          membership_id: string
          user_id: string
        }[]
      }
      search_club_members_page: {
        Args: {
          _club_id: string
          _limit?: number
          _offset?: number
          _role_filter?: string
          _search: string
        }
        Returns: Json
      }
      unpublish_club_public_website: {
        Args: { p_club_id: string }
        Returns: Json
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
