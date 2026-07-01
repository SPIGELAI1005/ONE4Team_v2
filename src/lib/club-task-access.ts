import {
  getDataScopeForModule,
  getModuleAccess,
  normalizeDashboardRole,
  type DashboardRole,
  type DataScope,
  type ModuleAccessLevel,
} from "@/lib/rbac-config";

export interface ClubTaskLike {
  assignee_user_id?: string | null;
  created_by?: string;
  team_id?: string | null;
}

export interface ClubTaskAccessOptions {
  scope: DataScope;
  accessLevel: ModuleAccessLevel;
  userId: string | null;
  userTeamIds: readonly string[];
  /** May create/edit/delete tasks for others (club admin / trainer persona). */
  canManageTasks: boolean;
  /** May delete any task (club admin persona). */
  canDeleteTasks: boolean;
}

/** Whether the active persona may browse all club tasks (not only own/team). */
export function canBrowseAllClubTasks(options: ClubTaskAccessOptions): boolean {
  return options.accessLevel === "full" || options.scope === "club";
}

/**
 * Task visibility from the active dashboard persona (gate role), not legacy membership admin.
 */
export function buildTaskAccessFromGateRole(
  gateRole: DashboardRole | string | null | undefined,
  userId: string | null,
  userTeamIds: readonly string[],
): ClubTaskAccessOptions {
  const role = normalizeDashboardRole(gateRole ?? undefined);
  const accessLevel = getModuleAccess(role, "tasks");
  const scope = getDataScopeForModule(role, "tasks");
  const canManageTasks =
    role === "admin" || role === "club_admin" || role === "trainer";
  const canDeleteTasks = role === "admin" || role === "club_admin";

  return {
    scope,
    accessLevel,
    userId,
    userTeamIds,
    canManageTasks,
    canDeleteTasks,
  };
}

export function isClubTaskVisibleToUser(
  row: ClubTaskLike,
  options: ClubTaskAccessOptions,
): boolean {
  if (canBrowseAllClubTasks(options)) return true;
  const userId = options.userId;
  if (!userId) return false;

  if (row.assignee_user_id === userId) return true;

  const { scope, userTeamIds } = options;

  if (scope === "own") {
    return row.created_by === userId;
  }

  if (scope === "assigned") {
    return false;
  }

  if (scope === "team" && row.team_id && userTeamIds.includes(row.team_id)) {
    return true;
  }

  return false;
}

export function filterClubTasksForUser<T extends ClubTaskLike>(
  rows: readonly T[],
  options: ClubTaskAccessOptions,
): T[] {
  if (canBrowseAllClubTasks(options)) return [...rows];
  return rows.filter((row) => isClubTaskVisibleToUser(row, options));
}
