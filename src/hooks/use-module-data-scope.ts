import { useMemo } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getDataScopeForModule,
  getModuleAccess,
  resolveDashboardRole,
  type DashboardModule,
  type DataScope,
  type ModuleAccessLevel,
} from "@/lib/rbac-config";
import { teamAdminTeamIds } from "@/lib/permissions";

export interface ModuleDataScope {
  role: ReturnType<typeof resolveDashboardRole>;
  accessLevel: ModuleAccessLevel;
  scope: DataScope;
  /** Team ids when access is team-scoped; `"all"` for club-wide. */
  teamIds: string[] | "all";
  isClubWide: boolean;
}

/**
 * Recommended query scope for a dashboard module — derived from RBAC matrix + assignments.
 */
export function useModuleDataScope(module: DashboardModule): ModuleDataScope {
  const perms = usePermissions();

  return useMemo(() => {
    const role = resolveDashboardRole(perms.role, perms.assignments);
    const accessLevel = getModuleAccess(role, module);
    const scope = getDataScopeForModule(role, module);
    const assignmentTeamIds = teamAdminTeamIds(perms.assignments);

    let teamIds: string[] | "all" = [];
    if (scope === "club" || accessLevel === "full" || accessLevel === "read") {
      teamIds = "all";
    } else if (scope === "team" || accessLevel === "team" || accessLevel === "limited") {
      teamIds = assignmentTeamIds.length > 0 ? assignmentTeamIds : [];
    }

    return {
      role,
      accessLevel,
      scope,
      teamIds,
      isClubWide: teamIds === "all",
    };
  }, [module, perms.role, perms.assignments]);
}

/** Apply team scope to a list of rows with a `team_id` field (client-side filter). */
export function filterRowsByTeamScope<T extends { team_id?: string | null }>(
  rows: T[],
  teamIds: string[] | "all",
): T[] {
  if (teamIds === "all") return rows;
  if (teamIds.length === 0) return [];
  const allowed = new Set(teamIds);
  return rows.filter((row) => row.team_id != null && allowed.has(row.team_id));
}
