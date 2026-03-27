import type { PlanId } from "@/lib/stripe";

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
    ai: boolean;
    analytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  kickoff: {
    maxMembers: 50,
    maxTeams: 3,
    maxStorageMb: 500,
    features: {
      members: true,
      teams: true,
      matches: true,
      events: true,
      communication: true,
      payments: false,
      partners: false,
      shop: false,
      clubPage: true,
      ai: false,
      analytics: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  squad: {
    maxMembers: 200,
    maxTeams: 10,
    maxStorageMb: 2048,
    features: {
      members: true,
      teams: true,
      matches: true,
      events: true,
      communication: true,
      payments: true,
      partners: true,
      shop: true,
      clubPage: true,
      ai: false,
      analytics: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  pro: {
    maxMembers: 1000,
    maxTeams: 50,
    maxStorageMb: 10240,
    features: {
      members: true,
      teams: true,
      matches: true,
      events: true,
      communication: true,
      payments: true,
      partners: true,
      shop: true,
      clubPage: true,
      ai: true,
      analytics: true,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  champions: {
    maxMembers: 5000,
    maxTeams: 200,
    maxStorageMb: 51200,
    features: {
      members: true,
      teams: true,
      matches: true,
      events: true,
      communication: true,
      payments: true,
      partners: true,
      shop: true,
      clubPage: true,
      ai: true,
      analytics: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
  bespoke: {
    maxMembers: Infinity,
    maxTeams: Infinity,
    maxStorageMb: Infinity,
    features: {
      members: true,
      teams: true,
      matches: true,
      events: true,
      communication: true,
      payments: true,
      partners: true,
      shop: true,
      clubPage: true,
      ai: true,
      analytics: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
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
