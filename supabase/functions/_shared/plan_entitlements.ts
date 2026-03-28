/**
 * Server-side plan feature checks for Edge Functions.
 * Keep in sync with `src/lib/plan-limits.ts` (features.shop / features.ai).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type BillablePlanFeature = "ai" | "shop";

/** Plans that include shop (Squad+). */
const SHOP_PLANS = new Set(["squad", "pro", "champions", "bespoke"]);
/** Plans that include AI (Pro+). */
const AI_PLANS = new Set(["pro", "champions", "bespoke"]);

function planAllows(planId: string | null | undefined, feature: BillablePlanFeature): boolean {
  const id = (planId ?? "kickoff").toLowerCase();
  if (feature === "shop") return SHOP_PLANS.has(id);
  return AI_PLANS.has(id);
}

export async function clubHasPlanFeature(
  admin: SupabaseClient,
  clubId: string,
  feature: BillablePlanFeature,
): Promise<{ allowed: boolean; detail?: string }> {
  const { data, error } = await admin
    .from("billing_subscriptions")
    .select("plan_id, status")
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    console.error("clubHasPlanFeature billing_subscriptions:", error.message);
    return { allowed: false, detail: "Billing check failed." };
  }
  if (!data) {
    return { allowed: false, detail: "No subscription record for this club." };
  }
  const status = String(data.status ?? "");
  if (status !== "active" && status !== "trialing") {
    return { allowed: false, detail: "Subscription is not active." };
  }
  const pid = data.plan_id as string | null;
  if (!planAllows(pid, feature)) {
    return { allowed: false, detail: "This club's plan does not include this feature." };
  }
  return { allowed: true };
}
