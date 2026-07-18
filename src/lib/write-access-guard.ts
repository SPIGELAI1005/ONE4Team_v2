import type { EffectivePlanResult } from "@/lib/effective-plan";

/**
 * Central write-access guard for grace / expired / no-plan states.
 * Pages should block create/edit when this returns false.
 */
export function canMutateClubData(effective: EffectivePlanResult): boolean {
  if (effective.limits.isNoPlan) return false;
  if (effective.status === "grace" || effective.status === "expired") return false;
  return effective.writeAccess;
}

export type GraceBlockedAction =
  | "create_member"
  | "create_team"
  | "create_activity"
  | "send_message"
  | "upload_file"
  | "edit_ops";

export function isGraceBlockedAction(
  effective: EffectivePlanResult,
  _action: GraceBlockedAction,
): boolean {
  return !canMutateClubData(effective);
}
