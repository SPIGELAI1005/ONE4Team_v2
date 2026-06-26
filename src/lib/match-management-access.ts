import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import { extractSommerfestMatchIdFromNotes } from "@/lib/tsv-allach-sommerfest-match-sync";
import { teamAdminTeamIds } from "@/lib/permissions";

export interface MatchManagementAccessInput {
  legacyRole: string | null;
  assignments: ClubRoleAssignmentRow[];
  isAdmin: boolean;
  hasMatchesWrite: boolean;
  coachedTeamIds: string[];
}

function teamScopedTrainerTeamIds(assignments: ClubRoleAssignmentRow[]): string[] {
  if (!assignments.length) return [];
  return assignments
    .filter(
      (assignment) =>
        assignment.scope === "team" &&
        assignment.scope_team_id &&
        (assignment.role_kind === "trainer" || assignment.role_kind === "team_admin"),
    )
    .map((assignment) => assignment.scope_team_id as string);
}

/** Club admins and club-wide trainers can manage all matches. */
export function isClubWideMatchManager(input: MatchManagementAccessInput): boolean {
  if (input.isAdmin) return true;
  if (input.legacyRole === "admin" || input.legacyRole === "trainer") return true;
  return input.assignments.some(
    (assignment) =>
      (assignment.role_kind === "club_admin" || assignment.role_kind === "trainer") &&
      assignment.scope === "club",
  );
}

export function manageableTeamIds(input: MatchManagementAccessInput): string[] | "all" {
  if (!input.hasMatchesWrite) return [];
  if (isClubWideMatchManager(input)) return "all";

  const ids = new Set<string>([
    ...input.coachedTeamIds,
    ...teamScopedTrainerTeamIds(input.assignments),
    ...teamAdminTeamIds(input.assignments),
  ]);
  return [...ids];
}

export function canCreateMatches(input: MatchManagementAccessInput): boolean {
  if (!input.hasMatchesWrite) return false;
  if (isClubWideMatchManager(input)) return true;
  return manageableTeamIds(input).length > 0;
}

export function canManageMatchForTeam(
  input: MatchManagementAccessInput,
  teamId: string | null | undefined,
): boolean {
  if (!input.hasMatchesWrite) return false;
  if (isClubWideMatchManager(input)) return true;
  if (!teamId) return false;

  const manageable = manageableTeamIds(input);
  if (manageable === "all") return true;
  return manageable.includes(teamId);
}

export function isSommerfestLinkedMatch(
  match: { notes?: string | null; sommerfestTemplateId?: string } | null | undefined,
): boolean {
  if (!match) return false;
  if (match.sommerfestTemplateId) return true;
  return Boolean(extractSommerfestMatchIdFromNotes(match.notes));
}

/** Sommerfest fixtures are club-coordinated — any trainer/admin with match write may adjust all of them. */
export function canManageSommerfestSchedule(input: MatchManagementAccessInput): boolean {
  if (!input.hasMatchesWrite) return false;
  return isClubWideMatchManager(input) || canCreateMatches(input);
}

export function canManageMatch(
  input: MatchManagementAccessInput,
  match: { team_id?: string | null; notes?: string | null; sommerfestTemplateId?: string } | null | undefined,
): boolean {
  if (!match) return false;
  if (isSommerfestLinkedMatch(match)) return canManageSommerfestSchedule(input);
  return canManageMatchForTeam(input, match.team_id);
}
