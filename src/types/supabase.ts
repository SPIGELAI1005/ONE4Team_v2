import type { Database } from "@/integrations/supabase/types";

export type ClubRow = Database["public"]["Tables"]["clubs"]["Row"];
export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
export type CompetitionRow = Database["public"]["Tables"]["competitions"]["Row"];
export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
export type MatchEventRow = Database["public"]["Tables"]["match_events"]["Row"];
export type MatchLineupRow = Database["public"]["Tables"]["match_lineups"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventParticipantRow = Database["public"]["Tables"]["event_participants"]["Row"];
export type ClubMembershipRow = Database["public"]["Tables"]["club_memberships"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileDisplay = Pick<ProfileRow, "display_name">;

// Common joined shapes used by pages (Supabase select with FK alias)
export type MembershipWithProfile = Pick<ClubMembershipRow, "id" | "user_id" | "club_id" | "role" | "status" | "team" | "age_group" | "position" | "created_at" | "updated_at"> & {
  profiles: ProfileDisplay | null;
};

export type ParticipantWithMembershipProfile = EventParticipantRow & {
  club_memberships?: {
    user_id: string;
    profiles?: ProfileDisplay | null;
  } | null;
};
