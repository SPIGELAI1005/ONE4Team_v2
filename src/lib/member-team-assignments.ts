import { supabase } from "@/integrations/supabase/client";

export interface ClubTeamOption {
  id: string;
  name: string;
  age_group: string | null;
}

export function isCoachMembershipRole(role: string | null | undefined): boolean {
  const normalized = (role || "").trim().toLowerCase();
  return normalized === "trainer" || normalized === "admin";
}

export function isPlayerMembershipRole(role: string | null | undefined): boolean {
  return (role || "").trim().toLowerCase() === "player";
}

export function resolveClubTeamIdFromLabel(
  teams: ClubTeamOption[],
  label: string | null | undefined,
): string {
  const trimmed = (label || "").trim();
  if (!trimmed) return "";
  const exact = teams.find((team) => team.name === trimmed);
  if (exact) return exact.id;
  const lower = trimmed.toLowerCase();
  const ci = teams.find((team) => team.name.toLowerCase() === lower);
  return ci?.id ?? "";
}

export function clubTeamNamesFromIds(teams: ClubTeamOption[], teamIds: string[]): string[] {
  const byId = new Map(teams.map((team) => [team.id, team.name]));
  return teamIds.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
}

export async function syncMembershipTeamAssignments(params: {
  membershipId: string;
  membershipRole: string;
  nextTeamIds: string[];
  existingPlayerTeamIds: string[];
  existingCoachTeamIds: string[];
  supportsTeamCoachesTable: boolean;
}): Promise<{ playerTeamIds: string[]; coachTeamIds: string[] }> {
  const {
    membershipId,
    membershipRole,
    nextTeamIds,
    existingPlayerTeamIds,
    existingCoachTeamIds,
    supportsTeamCoachesTable,
  } = params;

  const nextIds = Array.from(new Set(nextTeamIds.filter(Boolean)));
  const assignAsCoach = supportsTeamCoachesTable && isCoachMembershipRole(membershipRole);
  const targetPlayerIds = assignAsCoach ? [] : nextIds;
  const targetCoachIds = assignAsCoach ? nextIds : [];

  const playerToAdd = targetPlayerIds.filter((id) => !existingPlayerTeamIds.includes(id));
  const playerToRemove = existingPlayerTeamIds.filter((id) => !targetPlayerIds.includes(id));
  const coachToAdd = targetCoachIds.filter((id) => !existingCoachTeamIds.includes(id));
  const coachToRemove = existingCoachTeamIds.filter((id) => !targetCoachIds.includes(id));

  if (playerToRemove.length > 0) {
    const { error } = await supabase
      .from("team_players")
      .delete()
      .eq("membership_id", membershipId)
      .in("team_id", playerToRemove);
    if (error) throw error;
  }
  if (playerToAdd.length > 0) {
    const { error } = await supabase
      .from("team_players")
      .insert(playerToAdd.map((team_id) => ({ team_id, membership_id: membershipId })));
    if (error) throw error;
  }

  if (supportsTeamCoachesTable) {
    if (coachToRemove.length > 0) {
      const { error } = await supabase
        .from("team_coaches")
        .delete()
        .eq("membership_id", membershipId)
        .in("team_id", coachToRemove);
      if (error) throw error;
    }
    if (coachToAdd.length > 0) {
      const { error } = await supabase
        .from("team_coaches")
        .insert(coachToAdd.map((team_id) => ({ team_id, membership_id: membershipId })));
      if (error) throw error;
    }
  }

  return {
    playerTeamIds: targetPlayerIds,
    coachTeamIds: targetCoachIds,
  };
}
