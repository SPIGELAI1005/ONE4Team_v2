import type { PlanId } from "@/lib/stripe";

/**
 * Single source of truth for commercial plan packaging.
 * Marketing (`Pricing.tsx`), client gates (`plan-limits.ts`), and catalog seeds
 * should all derive from this file.
 *
 * Formula: yearly = monthly × 12 × 0.8 (20% yearly discount).
 * Volume: −15% on the full bill when active members exceed the plan threshold.
 */
export interface PlanCommercialConfig {
  id: PlanId;
  maxMembers: number;
  maxTeams: number;
  maxStorageMb: number;
  /** Fixed platform fee billed each month / year. */
  basePrice: { monthly: number; yearly: number };
  /** Per active member fee. */
  memberPrice: { monthly: number; yearly: number };
  /** Apply 15% volume discount when member count is strictly greater than this. */
  discountThreshold: number;
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
    clubPageMultilingual: boolean;
    ai: boolean;
    analytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

function yearlyFromMonthly(monthly: number): number {
  return Math.round(monthly * 12 * 0.8 * 100) / 100;
}

function pricePair(monthly: number): { monthly: number; yearly: number } {
  return { monthly, yearly: yearlyFromMonthly(monthly) };
}

export const VOLUME_DISCOUNT_PCT = 15;

/** Fair-use AI for Kick-off / Squad; Pro+ includes AI in the plan. */
export const AI4T_ADDON_PRICE_MONTHLY = 19;

export {
  AI_MONTHLY_CAPS,
  AI_USAGE_WARN_RATIO,
  BESPOKE_AI_MONTHLY_CAPS,
  getAiMonthlyCaps,
  type AiMonthlyCaps,
} from "@/lib/ai-usage-meter";

export const PLAN_CATALOG: Record<Exclude<PlanId, "bespoke">, PlanCommercialConfig> = {
  kickoff: {
    id: "kickoff",
    maxMembers: 100,
    maxTeams: 5,
    maxStorageMb: 1024,
    basePrice: pricePair(19),
    memberPrice: pricePair(0.15),
    discountThreshold: 80,
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
      clubPageMultilingual: false,
      ai: false,
      analytics: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  squad: {
    id: "squad",
    maxMembers: 400,
    maxTeams: 20,
    maxStorageMb: 5120,
    basePrice: pricePair(39),
    memberPrice: pricePair(0.25),
    discountThreshold: 300,
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
      clubPageMultilingual: false,
      ai: false,
      analytics: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    maxMembers: 1200,
    maxTeams: 60,
    maxStorageMb: 20480,
    basePrice: pricePair(79),
    memberPrice: pricePair(0.3),
    discountThreshold: 900,
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
      clubPageMultilingual: true,
      ai: true,
      analytics: true,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  champions: {
    id: "champions",
    maxMembers: 5000,
    maxTeams: 200,
    maxStorageMb: 102400,
    basePrice: pricePair(149),
    memberPrice: pricePair(0.4),
    discountThreshold: 2500,
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
      clubPageMultilingual: true,
      ai: true,
      analytics: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

export const BESPOKE_PLAN_LIMITS = {
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
    clubPageMultilingual: true,
    ai: true,
    analytics: true,
    customBranding: true,
    apiAccess: true,
    prioritySupport: true,
  },
} as const;

export interface PlanPriceBreakdown {
  total: number;
  base: number;
  memberCost: number;
  discount: boolean;
  discountPct: number;
}

export function calculateCatalogPrice(
  planId: PlanId,
  memberCount: number,
  billing: "yearly" | "monthly",
): PlanPriceBreakdown {
  if (planId === "bespoke") {
    return { total: -1, base: 0, memberCost: 0, discount: false, discountPct: 0 };
  }
  const plan = PLAN_CATALOG[planId];
  const base = plan.basePrice[billing];
  const memberCost = Math.max(0, memberCount) * plan.memberPrice[billing];
  let total = base + memberCost;
  const discount = memberCount > plan.discountThreshold;
  if (discount) total *= 1 - VOLUME_DISCOUNT_PCT / 100;
  return {
    total,
    base,
    memberCost,
    discount,
    discountPct: discount ? VOLUME_DISCOUNT_PCT : 0,
  };
}

/** Suggested plan for a club size (marketing + onboarding hint). */
export function suggestPlanForMemberCount(memberCount: number): Exclude<PlanId, "bespoke"> {
  if (memberCount <= PLAN_CATALOG.kickoff.maxMembers) return "kickoff";
  if (memberCount <= PLAN_CATALOG.squad.maxMembers) return "squad";
  if (memberCount <= PLAN_CATALOG.pro.maxMembers) return "pro";
  return "champions";
}
