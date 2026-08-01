import { supabase } from "@/integrations/supabase/client";

export interface ClubTeamOption {
  id: string;
  name: string;
  age_group: string | null;
}

/** Roles that belong on team_coaches rather than team_players. */
const COACH_MEMBERSHIP_ROLES = new Set([
  "trainer",
  "admin",
  "club_admin",
  "team_management",
  "staff",
  "team_staff",
]);

/** Legacy free-text division labels often stored on club_memberships.team before chip assignments. */
const LEGACY_DIVISION_TEAM_LABELS = new Set([
  "herren",
  "damen",
  "jugend",
  "senioren",
  "aktive",
  "aktiv",
  "freizeit",
]);

export function isCoachMembershipRole(role: string | null | undefined): boolean {
  const normalized = (role || "").trim().toLowerCase();
  return COACH_MEMBERSHIP_ROLES.has(normalized);
}

export function isPlayerMembershipRole(role: string | null | undefined): boolean {
  return (role || "").trim().toLowerCase() === "player";
}

export function isLegacyDivisionTeamLabel(label: string | null | undefined): boolean {
  return LEGACY_DIVISION_TEAM_LABELS.has((label || "").trim().toLowerCase());
}

export function looksLikeAgeGroupCode(label: string | null | undefined): boolean {
  const trimmed = (label || "").trim();
  if (!trimmed) return false;
  if (/^u\s*\d{1,2}([/-]\d{1,2})?$/i.test(trimmed)) return true;
  if (/^(bambini|minis|g-junioren|f-junioren|e-junioren|d-junioren|c-junioren|b-junioren|a-junioren)$/i.test(trimmed)) {
    return true;
  }
  return false;
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

/**
 * Label shown in Members overview / header.
 * Prefer real roster assignments; otherwise membership.team; heal the common case where
 * GesamtVerein (or another team name) was typed into age_group while team stayed Herren/Jugend.
 */
export function membershipDisplayTeamLabel(params: {
  assignedTeamNames: string[];
  membershipTeam: string | null | undefined;
  ageGroup?: string | null | undefined;
}): string {
  const assigned = params.assignedTeamNames.map((name) => name.trim()).filter(Boolean);
  if (assigned.length > 0) return assigned.join(", ");

  const team = (params.membershipTeam || "").trim();
  const age = (params.ageGroup || "").trim();

  if (
    age &&
    team &&
    age.toLowerCase() !== team.toLowerCase() &&
    isLegacyDivisionTeamLabel(team) &&
    !looksLikeAgeGroupCode(age)
  ) {
    return age;
  }

  return team;
}

/**
 * Seed edit form / chip selection from persisted membership + optional misfiled age_group.
 */
export function reconcileMemberTeamEditState(params: {
  clubTeams: ClubTeamOption[];
  playerTeamIds: string[];
  coachTeamIds: string[];
  membershipTeam: string | null | undefined;
  ageGroup: string | null | undefined;
}): { teamIds: string[]; team: string; ageGroup: string } {
  const existingIds = Array.from(new Set([...params.playerTeamIds, ...params.coachTeamIds].filter(Boolean)));
  if (existingIds.length > 0) {
    return {
      teamIds: existingIds,
      team: clubTeamNamesFromIds(params.clubTeams, existingIds).join(", ") || (params.membershipTeam || "").trim(),
      ageGroup: (params.ageGroup || "").trim(),
    };
  }

  const fromTeam = resolveClubTeamIdFromLabel(params.clubTeams, params.membershipTeam);
  const fromAge = resolveClubTeamIdFromLabel(params.clubTeams, params.ageGroup);
  const resolvedId = fromTeam || fromAge;
  if (resolvedId) {
    const name = clubTeamNamesFromIds(params.clubTeams, [resolvedId])[0] || "";
    const ageWasTeamName =
      Boolean(fromAge) &&
      !fromTeam &&
      (params.ageGroup || "").trim().toLowerCase() === name.toLowerCase();
    return {
      teamIds: [resolvedId],
      team: name || (params.membershipTeam || "").trim(),
      ageGroup: ageWasTeamName ? "" : (params.ageGroup || "").trim(),
    };
  }

  const display = membershipDisplayTeamLabel({
    assignedTeamNames: [],
    membershipTeam: params.membershipTeam,
    ageGroup: params.ageGroup,
  });
  const age = (params.ageGroup || "").trim();
  const movedAgeIntoTeam =
    Boolean(display) &&
    display.toLowerCase() === age.toLowerCase() &&
    display.toLowerCase() !== (params.membershipTeam || "").trim().toLowerCase();

  return {
    teamIds: [],
    team: display,
    ageGroup: movedAgeIntoTeam ? "" : age,
  };
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
