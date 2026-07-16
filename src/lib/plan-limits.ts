import type { PlanId } from "@/lib/stripe";
import { BESPOKE_PLAN_LIMITS, PLAN_CATALOG } from "@/lib/plan-catalog";

export interface PlanLimits {
  maxMembers: number;
  maxTeams: number;
  maxStorageMb: number;
  features: {
    members: boolean;
    teams: boolean;
    matches: boolean;
    events: boolean;
    communication: boolean;
    payments: boolean;
    partners: boolean;
    shop: boolean;
    clubPage: boolean;
    /** Public club page in two languages (e.g. EN + DE). Pro+ or trial. */
    clubPageMultilingual: boolean;
    ai: boolean;
    analytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  kickoff: {
    maxMembers: PLAN_CATALOG.kickoff.maxMembers,
    maxTeams: PLAN_CATALOG.kickoff.maxTeams,
    maxStorageMb: PLAN_CATALOG.kickoff.maxStorageMb,
    features: { ...PLAN_CATALOG.kickoff.features },
  },
  squad: {
    maxMembers: PLAN_CATALOG.squad.maxMembers,
    maxTeams: PLAN_CATALOG.squad.maxTeams,
    maxStorageMb: PLAN_CATALOG.squad.maxStorageMb,
    features: { ...PLAN_CATALOG.squad.features },
  },
  pro: {
    maxMembers: PLAN_CATALOG.pro.maxMembers,
    maxTeams: PLAN_CATALOG.pro.maxTeams,
    maxStorageMb: PLAN_CATALOG.pro.maxStorageMb,
    features: { ...PLAN_CATALOG.pro.features },
  },
  champions: {
    maxMembers: PLAN_CATALOG.champions.maxMembers,
    maxTeams: PLAN_CATALOG.champions.maxTeams,
    maxStorageMb: PLAN_CATALOG.champions.maxStorageMb,
    features: { ...PLAN_CATALOG.champions.features },
  },
  bespoke: {
    maxMembers: BESPOKE_PLAN_LIMITS.maxMembers,
    maxTeams: BESPOKE_PLAN_LIMITS.maxTeams,
    maxStorageMb: BESPOKE_PLAN_LIMITS.maxStorageMb,
    features: { ...BESPOKE_PLAN_LIMITS.features },
  },
};

export type FeatureKey = keyof PlanLimits["features"];

export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  if (!planId || !(planId in PLAN_LIMITS)) return PLAN_LIMITS.kickoff;
  return PLAN_LIMITS[planId as PlanId];
}

export function isFeatureAvailable(planId: string | null | undefined, feature: FeatureKey): boolean {
  return getPlanLimits(planId).features[feature];
}

export function isWithinMemberLimit(planId: string | null | undefined, currentCount: number): boolean {
  return currentCount < getPlanLimits(planId).maxMembers;
}

export function isWithinTeamLimit(planId: string | null | undefined, currentCount: number): boolean {
  return currentCount < getPlanLimits(planId).maxTeams;
}

export function getPlanDisplayName(planId: string | null | undefined): string {
  const names: Record<string, string> = {
    kickoff: "Kickoff",
    squad: "Squad",
    pro: "Pro",
    champions: "Champions",
    bespoke: "Bespoke",
  };
  return names[planId ?? ""] ?? "Free";
}

const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  members: "Members",
  teams: "Teams",
  matches: "Matches",
  events: "Events",
  communication: "Communication",
  payments: "Payments",
  partners: "Partners",
  shop: "Shop",
  clubPage: "Club page",
  clubPageMultilingual: "Multilingual club page",
  ai: "AI 4 T",
  analytics: "Analytics",
  customBranding: "Custom branding",
  apiAccess: "API access",
  prioritySupport: "Priority support",
};

/** Human-readable feature label for support/upgrade copy (not localized; product feature names). */
export function getFeatureDisplayName(feature: FeatureKey): string {
  return FEATURE_DISPLAY_NAMES[feature] ?? feature;
}
