import type { ClubRoleAssignmentRow, ClubRoleKind } from "@/lib/club-role-assignments";

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

export type Permission =
  | "members:read"
  | "members:write"
  | "schedule:read"
  | "schedule:write"
  | "matches:read"
  | "matches:write"
  | "payments:read"
  | "payments:write"
  | "partners:read"
  | "partners:write"
  | "settings:write";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    "members:read",
    "members:write",
    "schedule:read",
    "schedule:write",
    "matches:read",
    "matches:write",
    "payments:read",
    "payments:write",
    "partners:read",
    "partners:write",
    "settings:write",
  ],
  trainer: [
    "members:read",
    "schedule:read",
    "schedule:write",
    "matches:read",
    "matches:write",
  ],
  staff: ["members:read", "schedule:read", "matches:read"],
  player: ["members:read", "schedule:read", "matches:read"],
  member: ["members:read", "schedule:read", "matches:read"],
  parent: ["schedule:read", "matches:read"],
  sponsor: ["partners:read"],
  supplier: ["partners:read"],
  service_provider: ["partners:read"],
  consultant: ["partners:read"],
};

/** Permissions granted by a single assignment row (role_kind + scope). */
const KIND_PERMISSIONS: Record<ClubRoleKind, Permission[]> = {
  club_admin: ROLE_PERMISSIONS.admin,
  team_admin: [
    "members:read",
    "members:write",
    "schedule:read",
    "schedule:write",
    "matches:read",
    "matches:write",
  ],
  trainer: ROLE_PERMISSIONS.trainer,
  player: ROLE_PERMISSIONS.player,
  player_teen: ROLE_PERMISSIONS.player,
  player_adult: ROLE_PERMISSIONS.player,
  parent: ROLE_PERMISSIONS.parent,
  staff: ROLE_PERMISSIONS.staff,
  member: ROLE_PERMISSIONS.member,
  sponsor: ROLE_PERMISSIONS.sponsor,
  supplier: ROLE_PERMISSIONS.supplier,
  service_provider: ROLE_PERMISSIONS.service_provider,
  consultant: ROLE_PERMISSIONS.consultant,
};

function mergePermissionSets(lists: Permission[][]): Permission[] {
  const set = new Set<Permission>();
  for (const list of lists) {
    for (const p of list) set.add(p);
  }
  return Array.from(set);
}

export function permissionsForRole(role: string | null | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as AppRole] ?? [];
}

export function permissionsForRoleAssignments(assignments: ClubRoleAssignmentRow[]): Permission[] {
  if (!assignments.length) return [];
  return mergePermissionSets(
    assignments.map((a) => KIND_PERMISSIONS[a.role_kind] ?? []),
  );
}

/**
 * Effective permissions: union of legacy `club_memberships.role` and all scoped assignments.
 * When assignments are loaded, they extend (or reinforce) the legacy matrix.
 */
export function effectivePermissions(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
): Permission[] {
  const legacy = permissionsForRole(legacyRole);
  const fromAssignments = assignments?.length ? permissionsForRoleAssignments(assignments) : [];
  if (!fromAssignments.length) return legacy;
  if (!legacy.length) return fromAssignments;
  return mergePermissionSets([legacy, fromAssignments]);
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
  return (
    assignments?.some((a) => a.role_kind === "club_admin" && a.scope === "club") ?? false
  );
}

export function isTrainerCapability(
  legacyRole: string | null | undefined,
  assignments: ClubRoleAssignmentRow[] | null | undefined,
): boolean {
  if (legacyRole === "admin" || legacyRole === "trainer") return true;
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
