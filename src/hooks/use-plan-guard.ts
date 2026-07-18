import { useSubscription } from "@/hooks/use-subscription";
import {
  getPlanLimits,
  isFeatureInLimits,
  type FeatureKey,
} from "@/lib/plan-limits";
import { hasActiveFeatureTrial } from "@/lib/club-feature-trials";
import type { EffectivePlanResult } from "@/lib/effective-plan";

const DEV_UNLOCK_ALL =
  import.meta.env.DEV && import.meta.env.VITE_DEV_UNLOCK_ALL_FEATURES === "true";

interface UsePlanGuardReturn {
  planId: string | null;
  isActive: boolean;
  loading: boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  maxMembers: number;
  maxTeams: number;
  maxStorageMb: number;
  maxAdmins: number;
  writeAccess: boolean;
  effective: EffectivePlanResult;
  isPromotional: boolean;
  isNoPlan: boolean;
}

export function usePlanGuard(): UsePlanGuardReturn {
  const { planId, isActive, loading, trialFeatures, effective } = useSubscription();

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
      maxAdmins: bespoke.maxAdmins,
      writeAccess: true,
      effective,
      isPromotional: false,
      isNoPlan: false,
    };
  }

  const limits = effective.limits;

  return {
    planId,
    isActive,
    loading,
    canUseFeature: (feature: FeatureKey) =>
      hasActiveFeatureTrial(trialFeatures, feature) || isFeatureInLimits(limits, feature),
    maxMembers: limits.maxMembers,
    maxTeams: limits.maxTeams,
    maxStorageMb: limits.maxStorageMb,
    maxAdmins: limits.maxAdmins,
    writeAccess: effective.writeAccess,
    effective,
    isPromotional: effective.isPromotional,
    isNoPlan: Boolean(limits.isNoPlan),
  };
}
