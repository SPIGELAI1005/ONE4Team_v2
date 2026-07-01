/**
 * Legacy API-level permission strings and assignment merge helpers.
 *
 * **Dashboard module access** (menu, routes, data scope) is defined in `rbac-config.ts`.
 * This file bridges the RBAC matrix to `Permission[]` for `usePermissions()` and existing guards.
 * Pages should prefer `rbac-config` helpers for new code; do not define independent role matrices.
 */

import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";
import {
  marketplacePermissionsFor,
  type MarketplacePermission,
} from "@/lib/marketplace-permissions";
import {
  DASHBOARD_MODULES,
  getModuleAccess,
  isAccessAtLeast,
  normalizeDashboardRole,
  resolveDashboardRole,
  type DashboardModule,
  type DashboardRole,
  type ModuleAccessLevel,
} from "@/lib/rbac-config";

export type { MarketplacePermission } from "@/lib/marketplace-permissions";
export {
  MARKETPLACE_PERMISSIONS,
  hasMarketplacePermission,
  hasMarketplacePermissionInSet,
  marketplacePermissionsFor,
} from "@/lib/marketplace-permissions";

export type {
  DashboardModule,
  DashboardRole,
  DataScope,
  ModuleAccessLevel,
} from "@/lib/rbac-config";

export {
  canAccessModule,
  canWriteModule,
  formatDashboardRoleLabel,
  getDashboardPersonaOptions,
  getDataScopeForModule,
  getMobileNavModules,
  getModuleAccess,
  getModuleRoute,
  getRbacMatrix,
  getSidebarMenuItems,
  getVisibleMenuItems,
  isAccessAtLeast,
  isExternalRole,
  isInternalClubRole,
  isSportsRole,
  normalizeDashboardRole,
  normalizeRole,
  resolveDashboardRole,
  resolveSidebarMenuRole,
  DASHBOARD_MODULES,
  DASHBOARD_ROLES,
  EXTERNAL_ROLES,
  INTERNAL_CLUB_ROLES,
  MENU_MODULE_ORDER,
  MODULE_ROUTES,
  MOBILE_NAV_MAX_ITEMS,
  SIDEBAR_MENU_PROFILES,
  SPORTS_ROLES,
  UNKNOWN_SIDEBAR_MENU,
} from "@/lib/rbac-config";

export type AppRole =
  | "admin"
  | "trainer"
  | "player"
  | "staff"
  | "member"
  | "parent"
  | "sponsor"
  | "supplier"
  | "service_provider"
  | "consultant";

/** Fine-grained feature flags consumed by `usePermissions().has()` and route guards. */
export type Permission =
  | "members:read"
  | "members:write"
  | "schedule:read"
  | "schedule:write"
  | "matches:read"
  | "matches:write"
  | "events:read"
  | "events:write"
  | "reports:read"
  | "payments:read"
  | "payments:write"
  | "partners:read"
  | "partners:write"
  | MarketplacePermission
  | "tasks:read"
  | "tasks:write"
  | "settings:write";

function mergePermissionSets(lists: Permission[][]): Permission[] {
  const set = new Set<Permission>();
  for (const list of lists) {
    for (const p of list) set.add(p);
  }
  return Array.from(set);
}

function applyModuleLevelToLegacy(
  set: Set<Permission>,
  module: DashboardModule,
  level: ModuleAccessLevel,
): void {
  if (level === "none") return;
  const canRead = isAccessAtLeast(level, "read");
  const canWrite = level === "full" || level === "team";

  switch (module) {
    case "members":
    case "invites":
      if (canRead) set.add("members:read");
      if (canWrite || (module === "invites" && level === "team")) set.add("members:write");
      break;
    case "roles":
      if (canWrite) set.add("members:write");
      else if (canRead) set.add("members:read");
      break;
    case "trainings":
      if (canRead) set.add("schedule:read");
      if (canWrite) set.add("schedule:write");
      break;
    case "assets":
      if (level === "team" || level === "full" || level === "read") {
        if (canRead) set.add("schedule:read");
        if (canWrite) set.add("schedule:write");
      }
      break;
    case "matches":
      if (canRead) set.add("matches:read");
      if (canWrite) set.add("matches:write");
      break;
    case "events":
      if (canRead || level === "assigned") set.add("events:read");
      if (canWrite) set.add("events:write");
      break;
    case "reports":
      if (canRead || level === "own" || level === "limited") set.add("reports:read");
      break;
    case "payments":
      if (canRead || level === "own") set.add("payments:read");
      if (canWrite) set.add("payments:write");
      break;
    case "partners":
      if (canRead) set.add("partners:read");
      if (canWrite) set.add("partners:write");
      break;
    case "marketplace":
      break;
    case "tasks":
      if (canRead) set.add("tasks:read");
      if (canWrite || level === "assigned" || level === "own") set.add("tasks:write");
      break;
    case "settings":
    case "club_page":
    case "supplier_page":
      if (canWrite || level === "limited" || level === "own") set.add("settings:write");
      break;
    default:
      break;
  }
}

/** Derive legacy `Permission[]` from the RBAC module matrix (excludes marketplace fine-grains). */
export function legacyPermissionsFromRbac(
  role: DashboardRole | string | null | undefined,
): Permission[] {
  const normalized = typeof role === "string" ? normalizeDashboardRole(role) : role;
  const set = new Set<Permission>();
  for (const module of DASHBOARD_MODULES) {
    applyModuleLevelToLegacy(set, module, getModuleAccess(normalized, module));
  }
  return Array.from(set);
}

function withMarketplacePermissions(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
  base: Permission[],
): Permission[] {
  const marketplace = marketplacePermissionsFor(legacyRole, assignments);
  if (!marketplace.length) return base;
  return mergePermissionSets([base, marketplace]);
}

function permissionsForDashboardRole(role: DashboardRole | null): Permission[] {
  return legacyPermissionsFromRbac(role);
}

export function permissionsForRole(role: string | null | undefined): Permission[] {
  return permissionsForDashboardRole(normalizeDashboardRole(role));
}

export function permissionsForRoleAssignments(assignments: ClubRoleAssignmentRow[]): Permission[] {
  if (!assignments.length) return [];
  const roles = assignments
    .map((a) => normalizeDashboardRole(a.role_kind))
    .filter((r): r is DashboardRole => r != null);
  if (!roles.length) return [];
  return mergePermissionSets(roles.map((r) => permissionsForDashboardRole(r)));
}

/**
 * Effective permissions: union of legacy `club_memberships.role` and all scoped assignments.
 * When assignments are loaded, they extend (or reinforce) the legacy matrix.
 */
export function effectivePermissions(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
): Permission[] {
  const resolved = resolveDashboardRole(legacyRole, assignments);
  const fromResolved = permissionsForDashboardRole(resolved);
  let merged: Permission[];
  if (!assignments?.length) {
    merged = fromResolved;
  } else {
    const fromAssignments = permissionsForRoleAssignments(assignments);
    if (!fromResolved.length) merged = fromAssignments;
    else if (!fromAssignments.length) merged = fromResolved;
    else merged = mergePermissionSets([fromResolved, fromAssignments]);
  }
  return withMarketplacePermissions(legacyRole, assignments, merged);
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function hasPermissionInSet(perms: Permission[], permission: Permission): boolean {
  return perms.includes(permission);
}

export function isClubGeneralAdminFromAssignments(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
): boolean {
  if (legacyRole === "admin") return true;
  const resolved = resolveDashboardRole(legacyRole, assignments);
  return resolved === "admin" || resolved === "club_admin";
}

export function isTrainerCapability(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
): boolean {
  const resolved = resolveDashboardRole(legacyRole, assignments);
  if (resolved === "admin" || resolved === "club_admin" || resolved === "trainer") return true;
  return (
    assignments?.some(
      (a) => a.role_kind === "club_admin" || a.role_kind === "trainer" || a.role_kind === "team_admin",
    ) ?? false
  );
}

export function teamAdminTeamIds(assignments: ClubRoleAssignmentRow[] | null | undefined): string[] {
  if (!assignments?.length) return [];
  return assignments
    .filter((a) => a.role_kind === "team_admin" && a.scope === "team" && a.scope_team_id)
    .map((a) => a.scope_team_id as string);
}

/** Minimum legacy permissions that grant access to a dashboard module (any non-`none` level). */
export function legacyPermissionsForModule(module: DashboardModule): Permission[] {
  const set = new Set<Permission>();
  for (const level of ["read", "limited", "own", "assigned", "team", "full"] as ModuleAccessLevel[]) {
    applyModuleLevelToLegacy(set, module, level);
  }
  return Array.from(set);
}

/** Returns true when the role's RBAC matrix grants access to the module. */
export function canAccessModuleViaRbac(
  role: string | null | undefined,
  module: DashboardModule,
): boolean {
  return getModuleAccess(role, module) !== "none";
}
