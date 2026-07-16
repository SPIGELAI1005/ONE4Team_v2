/**
 * Edge-side AI monthly caps — keep in sync with `src/lib/ai-usage-meter.ts`.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface AiMonthlyCaps {
  agentRuns: number;
  conversations: number;
}

export const AI_MONTHLY_CAPS: Record<string, AiMonthlyCaps> = {
  kickoff: { agentRuns: 40, conversations: 150 },
  squad: { agentRuns: 80, conversations: 350 },
  pro: { agentRuns: 250, conversations: 1200 },
  champions: { agentRuns: 800, conversations: 4000 },
  bespoke: { agentRuns: 999_999, conversations: 999_999 },
};

export function getAiMonthlyCapsForPlan(planId: string | null | undefined): AiMonthlyCaps {
  const id = (planId ?? "kickoff").toLowerCase();
  return AI_MONTHLY_CAPS[id] ?? AI_MONTHLY_CAPS.kickoff;
}

export interface AiFairUseCheck {
  allowed: boolean;
  planId: string;
  caps: AiMonthlyCaps;
  usage: { agentRuns: number; conversations: number };
  reason?: "agent_runs" | "conversations";
}

export async function checkClubAiFairUse(
  admin: SupabaseClient,
  clubId: string,
): Promise<AiFairUseCheck> {
  const { data: billing } = await admin
    .from("billing_subscriptions")
    .select("plan_id, status")
    .eq("club_id", clubId)
    .maybeSingle();

  const planId = String(billing?.plan_id ?? "kickoff").toLowerCase();
  const status = String(billing?.status ?? "");
  const caps = getAiMonthlyCapsForPlan(planId);

  if (status !== "active" && status !== "trialing") {
    return { allowed: true, planId, caps, usage: { agentRuns: 0, conversations: 0 } };
  }

  const { data: usageRow, error } = await admin.rpc("get_club_ai_monthly_usage", {
    _club_id: clubId,
  });
  if (error) {
    console.error("get_club_ai_monthly_usage:", error.message);
    return { allowed: true, planId, caps, usage: { agentRuns: 0, conversations: 0 } };
  }

  const usage = {
    agentRuns: Number((usageRow as { agent_runs_total?: number })?.agent_runs_total ?? 0),
    conversations: Number((usageRow as { conversations_updated?: number })?.conversations_updated ?? 0),
  };

  if (usage.agentRuns >= caps.agentRuns) {
    return { allowed: false, planId, caps, usage, reason: "agent_runs" };
  }
  if (usage.conversations >= caps.conversations) {
    return { allowed: false, planId, caps, usage, reason: "conversations" };
  }

  return { allowed: true, planId, caps, usage };
}

export function buildAiFairUseRefusalMessage(
  lang: "en" | "de",
  check: AiFairUseCheck,
): string {
  const caps = check.caps;
  if (lang === "de") {
    if (check.reason === "conversations") {
      return `Das monatliche **AI 4 T**-Kontingent für Chat-Konversationen ist erreicht (${caps.conversations}/Monat auf dem ${check.planId}-Paket). Bitte nächsten Monat erneut nutzen oder euren Plan upgraden.`;
    }
    return `Das monatliche **AI 4 T**-Kontingent für Agent-Läufe ist erreicht (${caps.agentRuns}/Monat auf dem ${check.planId}-Paket). Bitte nächsten Monat erneut nutzen oder euren Plan upgraden.`;
  }
  if (check.reason === "conversations") {
    return `Your club has reached the monthly **AI 4 T** chat fair-use limit (${caps.conversations}/month on the ${check.planId} plan). Try again next month or upgrade your plan.`;
  }
  return `Your club has reached the monthly **AI 4 T** agent-run fair-use limit (${caps.agentRuns}/month on the ${check.planId} plan). Try again next month or upgrade your plan.`;
}
