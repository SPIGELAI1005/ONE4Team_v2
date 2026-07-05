import type { Ai4TRoleKey } from "@/lib/ai-4-t-role-prompts";
import type { AiContextScope } from "@/lib/ai-agent-access";
import type { ClubReportPersona } from "@/lib/club-report-persona";

/** Map club membership + assignments persona to the AI 4 T role key. */
export function resolvePublicClubAiRole(
  persona: ClubReportPersona,
  legacyRole: string | null | undefined,
): Ai4TRoleKey {
  const role = (legacyRole ?? "").toLowerCase();
  if (role === "parent") return "parent";
  if (role === "staff") return "staff";
  if (persona === "admin") return "admin";
  if (persona === "trainer") return "trainer";
  if (persona === "player") return "player";
  if (persona === "sponsor") return "sponsor";
  if (role === "supplier") return "supplier";
  if (role === "service_provider") return "service_provider";
  if (role === "consultant") return "consultant";
  return "member";
}

export function aiRoleToAgentPerms(role: Ai4TRoleKey): {
  canManageSchedule: boolean;
  canManageMembers: boolean;
} {
  if (role === "admin") return { canManageSchedule: true, canManageMembers: true };
  if (role === "trainer") return { canManageSchedule: true, canManageMembers: false };
  return { canManageSchedule: false, canManageMembers: false };
}

export function aiRoleToContextScope(role: Ai4TRoleKey, publicTeamId: string | null): AiContextScope {
  if (publicTeamId) return "public";
  if (role === "admin" || role === "trainer") return "staff";
  if (role === "player") return "player";
  return "member";
}
