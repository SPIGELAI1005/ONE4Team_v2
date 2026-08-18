import {
  canAccessModule,
  normalizeDashboardRole,
  type DashboardRole,
} from "@/lib/rbac-config";
import type { ClubRoleAssignmentRow } from "@/lib/club-role-assignments";

/** Membership ids visible in the family-scoped Members roster (self + linked wards). */
export function resolveFamilyMembershipIds(
  ownMembershipId: string | null | undefined,
  wardMembershipIds: readonly string[],
): string[] {
  const ids: string[] = [];
  if (ownMembershipId) ids.push(ownMembershipId);
  for (const wardId of wardMembershipIds) {
    if (!wardId || wardId === ownMembershipId || ids.includes(wardId)) continue;
    ids.push(wardId);
  }
  return ids;
}

export function hasParentRoleAssignment(
  assignments: readonly ClubRoleAssignmentRow[] | null | undefined,
): boolean {
  return (assignments ?? []).some((row) => row.role_kind === "parent");
}

const STAFF_MEMBERS_ROSTER_ROLES = new Set<DashboardRole>([
  "trainer",
  "team_staff",
  "team_management",
  "club_admin",
  "admin",
]);

/** Staff personas that use team/club roster on Members (unless viewing as Parent). */
export function isStaffMembersRosterPersona(
  gateRole: DashboardRole | string | null | undefined,
): boolean {
  const normalized =
    typeof gateRole === "string" ? normalizeDashboardRole(gateRole) : gateRole;
  return normalized != null && STAFF_MEMBERS_ROSTER_ROLES.has(normalized);
}

/** Route/nav access to Members for family-capable users (incl. dual player/trainer + parent). */
export function canAccessMembersModule(input: {
  gateRole: DashboardRole | null;
  hasGuardianWards: boolean;
  hasParentAssignment: boolean;
  isTrainer?: boolean;
  canManageMembers?: boolean;
}): boolean {
  if (input.canManageMembers) return true;
  if (input.isTrainer) return true;
  if (canAccessModule(input.gateRole, "members")) return true;
  if (input.hasGuardianWards) return true;
  if (input.hasParentAssignment) return true;
  return false;
}

/**
 * Family-scoped Members UI (self + linked children).
 * Dual-role users (player/trainer + parent) see this when their active persona is Parent,
 * or when they are a player/member acting as guardian — not while in trainer staff mode.
 */
export function isFamilyMembersView(input: {
  membersDataScope: string | null;
  hasGuardianWards: boolean;
  hasParentAssignment: boolean;
  canManageMembers: boolean;
  gateRole: DashboardRole | null;
}): boolean {
  if (input.membersDataScope === "family") return true;

  if (input.canManageMembers) return false;

  // Trainer / staff persona: team roster on Members; switch to Parent for family view.
  if (isStaffMembersRosterPersona(input.gateRole)) return false;

  return input.hasGuardianWards || input.hasParentAssignment;
}
