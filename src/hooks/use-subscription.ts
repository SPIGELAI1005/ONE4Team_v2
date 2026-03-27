import { useCallback, useEffect, useState } from "react";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { useClubId } from "@/hooks/use-club-id";
import type { SubscriptionRecord } from "@/lib/stripe";

interface UseSubscriptionReturn {
  subscription: SubscriptionRecord | null;
  loading: boolean;
  planId: string | null;
  isActive: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { clubId } = useClubId();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!clubId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabaseDynamic
        .from("billing_subscriptions")
        .select("*")
        .eq("club_id", clubId)
        .single();

      if (error || !data) {
        setSubscription(null);
      } else {
        setSubscription(data as unknown as SubscriptionRecord);
      }
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const planId = subscription?.plan_id ?? null;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  return { subscription, loading, planId, isActive, refresh };
}
