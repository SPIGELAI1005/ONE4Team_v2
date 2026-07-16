import type { PlanId } from "@/lib/stripe";

/** Monthly fair-use caps — keep in sync with `supabase/functions/_shared/ai_usage_caps.ts`. */
export interface AiMonthlyCaps {
  agentRuns: number;
  conversations: number;
}

export const AI_USAGE_WARN_RATIO = 0.85;

export const AI_MONTHLY_CAPS: Record<Exclude<PlanId, "bespoke">, AiMonthlyCaps> = {
  kickoff: { agentRuns: 40, conversations: 150 },
  squad: { agentRuns: 80, conversations: 350 },
  pro: { agentRuns: 250, conversations: 1200 },
  champions: { agentRuns: 800, conversations: 4000 },
};

export const BESPOKE_AI_MONTHLY_CAPS: AiMonthlyCaps = {
  agentRuns: 999_999,
  conversations: 999_999,
};

export interface AiUsageSnapshot {
  agentRuns: number;
  conversations: number;
}

export interface AiUsageMeterState {
  caps: AiMonthlyCaps;
  usage: AiUsageSnapshot;
  agentRunsPct: number;
  conversationsPct: number;
  highestPct: number;
  isNearCap: boolean;
  isAtCap: boolean;
}

export function getAiMonthlyCaps(planId: string | null | undefined): AiMonthlyCaps {
  if (planId === "bespoke") return BESPOKE_AI_MONTHLY_CAPS;
  if (!planId || !(planId in AI_MONTHLY_CAPS)) return AI_MONTHLY_CAPS.kickoff;
  return AI_MONTHLY_CAPS[planId as Exclude<PlanId, "bespoke">];
}

function pct(used: number, cap: number): number {
  if (cap <= 0 || !Number.isFinite(cap)) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export function buildAiUsageMeterState(
  planId: string | null | undefined,
  usage: AiUsageSnapshot,
  warnRatio = AI_USAGE_WARN_RATIO,
): AiUsageMeterState {
  const caps = getAiMonthlyCaps(planId);
  const agentRunsPct = pct(usage.agentRuns, caps.agentRuns);
  const conversationsPct = pct(usage.conversations, caps.conversations);
  const highestPct = Math.max(agentRunsPct, conversationsPct);
  const isAtCap = usage.agentRuns >= caps.agentRuns || usage.conversations >= caps.conversations;
  const isNearCap = !isAtCap && highestPct >= Math.round(warnRatio * 100);
  return {
    caps,
    usage,
    agentRunsPct,
    conversationsPct,
    highestPct,
    isNearCap,
    isAtCap,
  };
}

export function formatAiCapLabel(used: number, cap: number): string {
  if (cap >= 999_000) return `${used.toLocaleString()} / ∞`;
  return `${used.toLocaleString()} / ${cap.toLocaleString()}`;
}
