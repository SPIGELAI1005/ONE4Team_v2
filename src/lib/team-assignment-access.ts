import type { DashboardRole } from "@/lib/rbac-config";

export interface TeamAssignmentAccess {
  /** Open Edit Team / create team / change team meta (not player persona). */
  canManageTeams: boolean;
  /** Assign/remove players on a team roster. */
  canAssignPlayers: boolean;
  /** Assign/remove coaches/contacts (club admin only). */
  canAssignCoaches: boolean;
}

/**
 * Team roster assignment rights from the active dashboard persona (module gate role).
 * - Club admin / team management: manage teams + assign coaches and players
 * - Trainer: manage teams + assign players only
 * - Player / other: no manage or assign
 */
export function resolveTeamAssignmentAccess(
  gateRole: DashboardRole | null | undefined,
): TeamAssignmentAccess {
  const role = gateRole ?? null;
  const isAdmin = role === "admin" || role === "club_admin";
  const isTeamManagement = role === "team_management";
  const isTrainer = role === "trainer";
  return {
    canManageTeams: isAdmin || isTeamManagement || isTrainer,
    canAssignPlayers: isAdmin || isTeamManagement || isTrainer,
    canAssignCoaches: isAdmin || isTeamManagement,
  };
}
