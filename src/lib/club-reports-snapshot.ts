import { supabase } from "@/integrations/supabase/client";
import type { ClubReportPersona } from "@/lib/club-report-persona";

export interface ClubReportSnapshot {
  membersActive: number | null;
  teamsCount: number | null;
  upcomingMatches: number | null;
  bookingsNext7d: number | null;
  trainingsNext14d: number | null;
  unresolvedPlaceholders: number | null;
  coachTeamIds: string[];
  coachTrainings14d: number | null;
  playerTeamIds: string[];
  playerSessions14d: number | null;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  if (message.includes("Could not find the table")) return true;
  if (/\brelation\b.*\bdoes not exist\b/i.test(message)) return true;
  return false;
}

const emptySnapshot = (): ClubReportSnapshot => ({
  membersActive: null,
  teamsCount: null,
  upcomingMatches: null,
  bookingsNext7d: null,
  trainingsNext14d: null,
  unresolvedPlaceholders: null,
  coachTeamIds: [],
  coachTrainings14d: null,
  playerTeamIds: [],
  playerSessions14d: null,
});

export async function fetchClubReportSnapshot(input: {
  clubId: string;
  membershipId: string | null;
  persona: ClubReportPersona;
}): Promise<{ snapshot: ClubReportSnapshot; hadError: boolean }> {
  const { clubId, membershipId, persona } = input;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString();
  const in14 = new Date(now.getTime() + 14 * 86400000).toISOString();
  const nowIso = now.toISOString();
  const empty = emptySnapshot();
  let hadError = false;

  if (persona === "admin") {
    const [memRes, teamRes, matchRes, bookRes, trainRes, phRes] = await Promise.all([
      supabase.from("club_memberships").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active"),
      supabase.from("teams").select("id", { count: "exact", head: true }).eq("club_id", clubId),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .gte("match_date", today)
        .neq("status", "cancelled"),
      supabase
        .from("pitch_bookings")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .neq("status", "cancelled")
        .gte("starts_at", nowIso)
        .lte("starts_at", in7),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .ilike("type", "training")
        .gte("starts_at", nowIso)
        .lte("starts_at", in14),
      supabase
        .from("club_person_placeholders")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .is("resolved_membership_id", null),
    ]);

    let unresolvedPlaceholders: number | null = null;
    if (!phRes.error) unresolvedPlaceholders = phRes.count ?? 0;
    else if (!isMissingRelationError(phRes.error)) hadError = true;

    if (memRes.error || teamRes.error || matchRes.error || bookRes.error || trainRes.error) hadError = true;

    return {
      snapshot: {
        ...empty,
        membersActive: memRes.error ? null : memRes.count ?? 0,
        teamsCount: teamRes.error ? null : teamRes.count ?? 0,
        upcomingMatches: matchRes.error ? null : matchRes.count ?? 0,
        bookingsNext7d: bookRes.error ? null : bookRes.count ?? 0,
        trainingsNext14d: trainRes.error ? null : trainRes.count ?? 0,
        unresolvedPlaceholders,
      },
      hadError,
    };
  }

  if (persona === "trainer" && membershipId) {
    const coachRes = await supabase.from("team_coaches").select("team_id").eq("membership_id", membershipId);
    if (coachRes.error) return { snapshot: { ...empty, coachTeamIds: [] }, hadError: true };
    const coachTeamIds = [...new Set((coachRes.data || []).map((r) => String((r as { team_id?: string }).team_id || "")).filter(Boolean))];
    let coachTrainings14d: number | null = null;
    if (coachTeamIds.length > 0) {
      const tr = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .ilike("type", "training")
        .gte("starts_at", nowIso)
        .lte("starts_at", in14)
        .in("team_id", coachTeamIds);
      coachTrainings14d = tr.error ? null : tr.count ?? 0;
      if (tr.error) hadError = true;
    }
    return { snapshot: { ...empty, coachTeamIds, coachTrainings14d }, hadError };
  }

  if (persona === "player" && membershipId) {
    const tpRes = await supabase.from("team_players").select("team_id").eq("membership_id", membershipId);
    if (tpRes.error) return { snapshot: { ...empty, playerTeamIds: [] }, hadError: true };
    const playerTeamIds = [...new Set((tpRes.data || []).map((r) => String((r as { team_id?: string }).team_id || "")).filter(Boolean))];
    let playerSessions14d: number | null = null;
    if (playerTeamIds.length > 0) {
      const tr = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .gte("starts_at", nowIso)
        .lte("starts_at", in14)
        .in("team_id", playerTeamIds);
      playerSessions14d = tr.error ? null : tr.count ?? 0;
      if (tr.error) hadError = true;
    }
    return { snapshot: { ...empty, playerTeamIds, playerSessions14d }, hadError };
  }

  return { snapshot: empty, hadError: false };
}
