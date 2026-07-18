import { useCallback, useEffect, useState } from "react";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";
import type { SubscriptionRecord } from "@/lib/stripe";
import {
  activeTrialFeatures,
  type ClubFeatureTrialRow,
  type TrialFeatureKey,
} from "@/lib/club-feature-trials";
import { effectivePlanFromSubscription } from "@/lib/subscription-effective";
import type { EffectivePlanResult, ModuleOverride } from "@/lib/effective-plan";
import {
  fetchMyClubModuleOverrides,
  inferOperatorFullAccess,
} from "@/lib/club-module-overrides";

interface UseSubscriptionReturn {
  subscription: SubscriptionRecord | null;
  loading: boolean;
  planId: string | null;
  isActive: boolean;
  trialFeatures: Set<TrialFeatureKey>;
  effective: EffectivePlanResult;
  moduleOverrides: ModuleOverride[];
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { clubId } = useClubId();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [trialFeatures, setTrialFeatures] = useState<Set<TrialFeatureKey>>(new Set());
  const [moduleOverrides, setModuleOverrides] = useState<ModuleOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!clubId) {
      setSubscription(null);
      setTrialFeatures(new Set());
      setModuleOverrides([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [subResult, trialsResult, overrides] = await Promise.all([
        supabaseDynamic.from("billing_subscriptions").select("*").eq("club_id", clubId).maybeSingle(),
        supabaseDynamic
          .from("club_feature_trials")
          .select("feature, expires_at, note")
          .eq("club_id", clubId),
        fetchMyClubModuleOverrides(clubId),
      ]);

      if (subResult.error || !subResult.data) {
        setSubscription(null);
      } else {
        setSubscription(subResult.data as unknown as SubscriptionRecord);
      }

      if (trialsResult.error || !trialsResult.data) {
        setTrialFeatures(new Set());
      } else {
        setTrialFeatures(activeTrialFeatures(trialsResult.data as ClubFeatureTrialRow[]));
      }

      setModuleOverrides(overrides);
    } catch {
      setSubscription(null);
      setTrialFeatures(new Set());
      setModuleOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const effective = effectivePlanFromSubscription(subscription, {
    moduleOverrides,
    operatorFullAccess:
      inferOperatorFullAccess(moduleOverrides) ||
      Boolean((subscription?.metadata as Record<string, unknown> | undefined)?.operator_full_access),
  });
  const planId = effective.planId === "no_plan" ? null : effective.planId;
  const isActive =
    effective.status === "active" ||
    effective.status === "trialing" ||
    effective.status === "promotional" ||
    effective.status === "past_due";

  return {
    subscription,
    loading,
    planId,
    isActive,
    trialFeatures,
    effective,
    moduleOverrides,
    refresh,
  };
}
