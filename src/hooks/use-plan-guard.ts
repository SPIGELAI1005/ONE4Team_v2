import { useSubscription } from "@/hooks/use-subscription";
import { getPlanLimits, isFeatureAvailable, type FeatureKey } from "@/lib/plan-limits";

const DEV_UNLOCK_ALL = import.meta.env.VITE_DEV_UNLOCK_ALL_FEATURES === "true";

interface UsePlanGuardReturn {
  planId: string | null;
  isActive: boolean;
  loading: boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  maxMembers: number;
  maxTeams: number;
  maxStorageMb: number;
}

export function usePlanGuard(): UsePlanGuardReturn {
  const { planId, isActive, loading } = useSubscription();

  if (DEV_UNLOCK_ALL) {
    const bespoke = getPlanLimits("bespoke");
    return {
      planId: "bespoke",
      isActive: true,
      loading: false,
      canUseFeature: () => true,
      maxMembers: bespoke.maxMembers,
      maxTeams: bespoke.maxTeams,
      maxStorageMb: bespoke.maxStorageMb,
    };
  }

  const limits = getPlanLimits(planId);

  return {
    planId,
    isActive,
    loading,
    canUseFeature: (feature: FeatureKey) => isFeatureAvailable(planId, feature),
    maxMembers: limits.maxMembers,
    maxTeams: limits.maxTeams,
    maxStorageMb: limits.maxStorageMb,
  };
}
