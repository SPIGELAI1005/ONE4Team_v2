import { useCallback, useEffect, useState } from "react";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";
import type { SubscriptionRecord } from "@/lib/stripe";
import {
  activeTrialFeatures,
  type ClubFeatureTrialRow,
  type TrialFeatureKey,
} from "@/lib/club-feature-trials";

interface UseSubscriptionReturn {
  subscription: SubscriptionRecord | null;
  loading: boolean;
  planId: string | null;
  isActive: boolean;
  trialFeatures: Set<TrialFeatureKey>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { clubId } = useClubId();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [trialFeatures, setTrialFeatures] = useState<Set<TrialFeatureKey>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!clubId) {
      setSubscription(null);
      setTrialFeatures(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [subResult, trialsResult] = await Promise.all([
        supabaseDynamic.from("billing_subscriptions").select("*").eq("club_id", clubId).single(),
        supabaseDynamic
          .from("club_feature_trials")
          .select("feature, expires_at, note")
          .eq("club_id", clubId),
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
    } catch {
      setSubscription(null);
      setTrialFeatures(new Set());
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const planId = subscription?.plan_id ?? null;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  return { subscription, loading, planId, isActive, trialFeatures, refresh };
}
