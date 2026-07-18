/**
 * Server-side plan feature checks for Edge Functions.
 * Keep feature sets aligned with `src/lib/plan-catalog.ts` / `plan-entitlements.ts`.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type BillablePlanFeature = "ai" | "shop" | "chat" | "partners";

/** Kick-off+ include shop/partners (commercial ladder 2026-07). */
const SHOP_PLANS = new Set(["kickoff", "squad", "pro", "champions", "bespoke"]);
const PARTNER_PLANS = new Set(["kickoff", "squad", "pro", "champions", "bespoke"]);
/** Plans that include AI 4 T (Squad+). */
const AI_PLANS = new Set(["squad", "pro", "champions", "bespoke"]);
/** Chat: paid kickoff+, not promotional kickoff (resolver handles promo). */
const CHAT_PLANS = new Set(["kickoff", "squad", "pro", "champions", "bespoke"]);

function planAllows(planId: string | null | undefined, feature: BillablePlanFeature): boolean {
  const id = (planId ?? "").toLowerCase();
  if (!id) return false;
  if (feature === "shop") return SHOP_PLANS.has(id);
  if (feature === "partners") return PARTNER_PLANS.has(id);
  if (feature === "chat") return CHAT_PLANS.has(id);
  return AI_PLANS.has(id);
}

async function clubHasActiveFeatureTrial(
  admin: SupabaseClient,
  clubId: string,
  feature: BillablePlanFeature,
): Promise<boolean> {
  if (feature !== "ai" && feature !== "shop") return false;
  const { data, error } = await admin
    .from("club_feature_trials")
    .select("expires_at")
    .eq("club_id", clubId)
    .eq("feature", feature)
    .maybeSingle();

  if (error) {
    console.error("clubHasActiveFeatureTrial:", error.message);
    return false;
  }
  if (!data?.expires_at) return false;
  const expires = Date.parse(String(data.expires_at));
  return Number.isFinite(expires) && expires > Date.now();
}

export async function clubHasPlanFeature(
  admin: SupabaseClient,
  clubId: string,
  feature: BillablePlanFeature,
): Promise<{ allowed: boolean; detail?: string }> {
  if (await clubHasActiveFeatureTrial(admin, clubId, feature)) {
    return { allowed: true };
  }

  const { data, error } = await admin
    .from("billing_subscriptions")
    .select("plan_id, status, access_source, metadata")
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
  const accessSource = String(data.access_source ?? "");
  const allowedStatuses = new Set(["active", "trialing", "promotional", "past_due"]);
  if (!allowedStatuses.has(status)) {
    return { allowed: false, detail: "Subscription is not active." };
  }

  // Operator grant / grandfather in metadata
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  if (meta.operator_full_access === true) {
    return { allowed: true };
  }

  // Runtime Operator module overrides (club_module_entitlements)
  const { data: overrides, error: ovErr } = await admin
    .from("club_module_entitlements")
    .select("enabled, modules!inner(key)")
    .eq("club_id", clubId)
    .eq("enabled", true);
  if (!ovErr && Array.isArray(overrides)) {
    const keys = new Set(
      overrides.map((row: { modules?: { key?: string } | { key?: string }[] }) => {
        const m = row.modules;
        if (Array.isArray(m)) return m[0]?.key;
        return m?.key;
      }).filter(Boolean),
    );
    if (feature === "chat" && (keys.has("communication") || keys.has("chat"))) {
      return { allowed: true };
    }
    if (feature === "ai" && keys.has("ai")) return { allowed: true };
    if (feature === "shop" && keys.has("shop")) return { allowed: true };
    if (feature === "partners" && (keys.has("partners") || keys.has("marketplace"))) {
      return { allowed: true };
    }
  }

  const pid = data.plan_id as string | null;
  if (feature === "chat") {
    // Promotional Kick-off: announcements only unless grandfather / paid
    if (status === "promotional" || accessSource === "commercial_offer") {
      if (meta.grandfather_kickoff === true || meta.operator_full_access === true) {
        return { allowed: true };
      }
      return { allowed: false, detail: "Founding Club Kick-off includes announcements only." };
    }
  }

  if (!planAllows(pid, feature)) {
    return { allowed: false, detail: "This club's plan does not include this feature." };
  }
  return { allowed: true };
}
