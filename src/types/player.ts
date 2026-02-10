import type { MembershipWithProfile } from "@/types/supabase";

export type ClubMembershipProfileRow = MembershipWithProfile;

export interface MatchRowLite {
  id: string;
  opponent: string;
  is_home: boolean;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

export interface MatchEventRowLite {
  match_id: string;
  event_type: string;
  minute: number | null;
}

export interface MatchLineupRowLite {
  match_id: string;
}

export interface EventParticipationWithEvent {
  event_id: string;
  status: string;
  events?: {
    title: string;
    starts_at: string;
  } | null;
}
