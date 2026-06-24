import { supabase } from "@/integrations/supabase/client";
import type { TrialFeatureKey } from "@/lib/club-feature-trials";
import { activeTrialFeatures } from "@/lib/club-feature-trials";
import { isFeatureAvailable } from "@/lib/plan-limits";

export type ClubPublicPremiumFeature = "ai" | "shop" | "multilingual";

/** Mirrors Edge `club_public_has_feature` for authenticated fallbacks (preview / RPC not applied). */
export function clubHasPremiumFeatureFromPlan(
  planId: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  trialFeatures: Set<TrialFeatureKey>,
  feature: ClubPublicPremiumFeature,
): boolean {
  if (trialFeatures.has(feature)) return true;
  if (subscriptionStatus !== "active" && subscriptionStatus !== "trialing") return false;
  if (feature === "multilingual") return isFeatureAvailable(planId, "clubPageMultilingual");
  return isFeatureAvailable(planId, feature);
}

export async function fetchClubPublicHasFeature(
  clubId: string,
  feature: ClubPublicPremiumFeature,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("club_public_has_feature", {
    p_club_id: clubId,
    p_feature: feature,
  });
  if (!error && typeof data === "boolean") return data;
  return false;
}

/** Member-scoped billing read when public RPC is unavailable (e.g. migration pending). */
export async function fetchClubMemberPremiumFeature(
  clubId: string,
  feature: ClubPublicPremiumFeature,
): Promise<boolean> {
  const [subResult, trialsResult] = await Promise.all([
    supabase.from("billing_subscriptions").select("plan_id, status").eq("club_id", clubId).maybeSingle(),
    supabase.from("club_feature_trials").select("feature, expires_at").eq("club_id", clubId),
  ]);

  const trials = activeTrialFeatures(
    (trialsResult.data ?? []) as { feature: string; expires_at: string }[],
  );
  const row = subResult.data as { plan_id?: string; status?: string } | null;
  return clubHasPremiumFeatureFromPlan(row?.plan_id ?? null, row?.status ?? null, trials, feature);
}
