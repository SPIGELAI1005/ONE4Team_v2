import type { MembershipWithProfile } from "@/types/supabase";

export interface MembershipOption {
  id: string;
  name: string;
}

export interface MatchEventLite {
  event_type: string;
  membership_id: string | null;
  minute: number | null;
}

export interface MatchLite {
  id: string;
  status: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
}

export interface AttendanceParticipationRow {
  status: string;
  events?: {
    starts_at: string;
  } | null;
}

export interface LineupAppearanceRow {
  match_id: string;
  matches?: {
    match_date: string;
  } | null;
}

export type MemberNameRow = MembershipWithProfile;
