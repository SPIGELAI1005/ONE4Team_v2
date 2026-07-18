import type { PlanId } from "@/lib/stripe";
import {
  BESPOKE_PLAN_LIMITS,
  PLAN_CATALOG,
  kickoffPaidFeatures,
} from "@/lib/plan-catalog";
import {
  type FeatureKey,
  type PlanFeatureMap,
  type SupportTier,
  FEATURE_DISPLAY_NAMES,
  allFeaturesOff,
  withLegacyAliases,
} from "@/lib/plan-entitlements";
import { getAiMonthlyCaps, type AiMonthlyCaps } from "@/lib/ai-usage-meter";

export type { FeatureKey, PlanFeatureMap, SupportTier };
export { FEATURE_DISPLAY_NAMES };

export interface PlanLimits {
  maxMembers: number;
  maxTeams: number;
  maxStorageMb: number;
  maxAdmins: number;
  maxTrainers: number | null;
  supportTier: SupportTier;
  features: PlanFeatureMap;
  /** Internal marker — not a public commercial package. */
  isNoPlan?: boolean;
}

/** Deny-by-default: auth / onboarding / pricing / support only. */
export const NO_PLAN_LIMITS: PlanLimits = {
  maxMembers: 0,
  maxTeams: 0,
  maxStorageMb: 0,
  maxAdmins: 0,
  maxTrainers: 0,
  supportTier: "self_service",
  features: withLegacyAliases(allFeaturesOff()),
  isNoPlan: true,
};

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  kickoff: {
    maxMembers: PLAN_CATALOG.kickoff.maxMembers,
    maxTeams: PLAN_CATALOG.kickoff.maxTeams,
    maxStorageMb: PLAN_CATALOG.kickoff.maxStorageMb,
    maxAdmins: PLAN_CATALOG.kickoff.maxAdmins,
    maxTrainers: PLAN_CATALOG.kickoff.maxTrainers,
    supportTier: PLAN_CATALOG.kickoff.supportTier,
    features: { ...PLAN_CATALOG.kickoff.features },
  },
  squad: {
    maxMembers: PLAN_CATALOG.squad.maxMembers,
    maxTeams: PLAN_CATALOG.squad.maxTeams,
    maxStorageMb: PLAN_CATALOG.squad.maxStorageMb,
    maxAdmins: PLAN_CATALOG.squad.maxAdmins,
    maxTrainers: PLAN_CATALOG.squad.maxTrainers,
    supportTier: PLAN_CATALOG.squad.supportTier,
    features: { ...PLAN_CATALOG.squad.features },
  },
  pro: {
    maxMembers: PLAN_CATALOG.pro.maxMembers,
    maxTeams: PLAN_CATALOG.pro.maxTeams,
    maxStorageMb: PLAN_CATALOG.pro.maxStorageMb,
    maxAdmins: PLAN_CATALOG.pro.maxAdmins,
    maxTrainers: PLAN_CATALOG.pro.maxTrainers,
    supportTier: PLAN_CATALOG.pro.supportTier,
    features: { ...PLAN_CATALOG.pro.features },
  },
  champions: {
    maxMembers: PLAN_CATALOG.champions.maxMembers,
    maxTeams: PLAN_CATALOG.champions.maxTeams,
    maxStorageMb: PLAN_CATALOG.champions.maxStorageMb,
    maxAdmins: PLAN_CATALOG.champions.maxAdmins,
    maxTrainers: PLAN_CATALOG.champions.maxTrainers,
    supportTier: PLAN_CATALOG.champions.supportTier,
    features: { ...PLAN_CATALOG.champions.features },
  },
  bespoke: {
    maxMembers: BESPOKE_PLAN_LIMITS.maxMembers,
    maxTeams: BESPOKE_PLAN_LIMITS.maxTeams,
    maxStorageMb: BESPOKE_PLAN_LIMITS.maxStorageMb,
    maxAdmins: BESPOKE_PLAN_LIMITS.maxAdmins,
    maxTrainers: BESPOKE_PLAN_LIMITS.maxTrainers,
    supportTier: BESPOKE_PLAN_LIMITS.supportTier,
    features: { ...BESPOKE_PLAN_LIMITS.features },
  },
};

/**
 * Resolve static catalogue limits for a plan id.
 * Missing / invalid / null → NO_PLAN (deny-by-default), never Kick-off.
 */
export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  if (!planId || !(planId in PLAN_LIMITS)) return NO_PLAN_LIMITS;
  return PLAN_LIMITS[planId as PlanId];
}

/** Catalogue Kick-off with chat unlocked (paid / grandfather). */
export function getKickoffPaidLimits(): PlanLimits {
  return {
    ...PLAN_LIMITS.kickoff,
    features: kickoffPaidFeatures(),
  };
}

export function isFeatureAvailable(planId: string | null | undefined, feature: FeatureKey): boolean {
  return Boolean(getPlanLimits(planId).features[feature]);
}

export function isFeatureInLimits(limits: PlanLimits, feature: FeatureKey): boolean {
  return Boolean(limits.features[feature]);
}

export function isWithinMemberLimit(planId: string | null | undefined, currentCount: number): boolean {
  const max = getPlanLimits(planId).maxMembers;
  if (!Number.isFinite(max)) return true;
  return currentCount < max;
}

export function isWithinTeamLimit(planId: string | null | undefined, currentCount: number): boolean {
  const max = getPlanLimits(planId).maxTeams;
  if (!Number.isFinite(max)) return true;
  return currentCount < max;
}

export function isWithinAdminLimit(planId: string | null | undefined, currentCount: number): boolean {
  const max = getPlanLimits(planId).maxAdmins;
  if (!Number.isFinite(max)) return true;
  return currentCount < max;
}

export function getPlanDisplayName(planId: string | null | undefined): string {
  if (!planId || planId === "no_plan") return "Unassigned";
  const names: Record<string, string> = {
    kickoff: "Kick-off",
    squad: "Squad",
    pro: "Pro",
    champions: "Champions",
    bespoke: "Bespoke",
  };
  return names[planId] ?? "Unassigned";
}

/** Human-readable feature label for support/upgrade copy (not localized). */
export function getFeatureDisplayName(feature: FeatureKey): string {
  return FEATURE_DISPLAY_NAMES[feature] ?? feature;
}

/** Monthly AI 4 T fair-use caps for the active plan (mirrors Edge `ai_usage_caps.ts`). */
export function getPlanAiMonthlyCaps(planId: string | null | undefined): AiMonthlyCaps {
  return getAiMonthlyCaps(planId);
}

/** Lowest public plan that includes a feature (for upgrade CTAs). */
export function firstPlanIncludingFeature(feature: FeatureKey): PlanId | null {
  const order: PlanId[] = ["kickoff", "squad", "pro", "champions", "bespoke"];
  for (const id of order) {
    if (getPlanLimits(id).features[feature]) return id;
  }
  return null;
}
