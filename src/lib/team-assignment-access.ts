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
 * - Club admin: manage teams + assign coaches and players
 * - Trainer: manage teams + assign players only
 * - Player / other: no manage or assign
 */
export function resolveTeamAssignmentAccess(
  gateRole: DashboardRole | null | undefined,
): TeamAssignmentAccess {
  const role = gateRole ?? null;
  const isAdmin = role === "admin" || role === "club_admin";
  const isTrainer = role === "trainer";
  return {
    canManageTeams: isAdmin || isTrainer,
    canAssignPlayers: isAdmin || isTrainer,
    canAssignCoaches: isAdmin,
  };
}
