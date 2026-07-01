import type { DashboardRole } from "@/lib/rbac-config";

const WORKFLOW_ROLES: DashboardRole[] = ["admin", "club_admin", "trainer"];

export type AiContextScope = "staff" | "player" | "member" | "public";

/** Trainer/admin workflows (propose → confirm → execute). Players and members get chat only. */
export function canUseClubAgentWorkflows(role: DashboardRole | null | undefined): boolean {
  if (!role) return false;
  return WORKFLOW_ROLES.includes(role);
}

export function canUseClubAgentChat(_role: DashboardRole | null | undefined): boolean {
  return true;
}

export function resolveAiContextScope(
  gateRole: DashboardRole | null | undefined,
  opts?: { publicEmbed?: boolean },
): AiContextScope {
  if (opts?.publicEmbed) return "public";
  if (!gateRole || gateRole === "admin" || gateRole === "club_admin" || gateRole === "trainer") {
    return "staff";
  }
  if (gateRole === "player") return "player";
  return "member";
}
