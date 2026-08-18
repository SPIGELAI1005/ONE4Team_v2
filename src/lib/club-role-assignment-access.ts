import type { ClubRoleKind } from "@/lib/club-role-assignments";

/** Role kinds member managers (team management, etc.) may assign — not club admins only. */
export const MEMBER_MANAGER_ASSIGNABLE_ROLE_KINDS: readonly ClubRoleKind[] = [
  "trainer",
  "player",
  "player_teen",
  "player_adult",
  "parent",
  "member",
  "fan",
  "supporter",
] as const;

const MEMBER_MANAGER_ASSIGNABLE_SET = new Set<string>(MEMBER_MANAGER_ASSIGNABLE_ROLE_KINDS);

export function isMemberManagerAssignableRoleKind(roleKind: ClubRoleKind): boolean {
  return MEMBER_MANAGER_ASSIGNABLE_SET.has(roleKind);
}

export function filterAssignableRoleKinds(
  roleKinds: readonly { value: ClubRoleKind; label: string }[],
  isClubAdmin: boolean,
): { value: ClubRoleKind; label: string }[] {
  if (isClubAdmin) return [...roleKinds];
  return roleKinds.filter((rk) => isMemberManagerAssignableRoleKind(rk.value));
}

export function canEditRoleAssignment(isClubAdmin: boolean, roleKind: ClubRoleKind): boolean {
  return isClubAdmin || isMemberManagerAssignableRoleKind(roleKind);
}
