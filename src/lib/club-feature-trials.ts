import type { FeatureKey } from "@/lib/plan-limits";

export type TrialFeatureKey = "ai" | "shop";

export interface ClubFeatureTrialRow {
  feature: TrialFeatureKey;
  expires_at: string;
  note?: string | null;
}

const TRIAL_FEATURES = new Set<TrialFeatureKey>(["ai", "shop"]);

export function isTrialFeatureKey(value: string): value is TrialFeatureKey {
  return TRIAL_FEATURES.has(value as TrialFeatureKey);
}

/** Active trials for the club (not expired). */
export function activeTrialFeatures(rows: ClubFeatureTrialRow[] | null | undefined): Set<TrialFeatureKey> {
  const out = new Set<TrialFeatureKey>();
  if (!rows?.length) return out;
  const now = Date.now();
  for (const row of rows) {
    if (!isTrialFeatureKey(row.feature)) continue;
    const expires = Date.parse(row.expires_at);
    if (Number.isFinite(expires) && expires > now) out.add(row.feature);
  }
  return out;
}

export function hasActiveFeatureTrial(
  trials: Set<TrialFeatureKey>,
  feature: FeatureKey,
): boolean {
  if (feature === "ai" || feature === "shop") return trials.has(feature);
  return false;
}
