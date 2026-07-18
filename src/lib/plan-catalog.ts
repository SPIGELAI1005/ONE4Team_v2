import type { PlanId } from "@/lib/stripe";
import {
  type PlanFeatureMap,
  type SupportTier,
  withLegacyAliases,
  kickoffGranularEntitlements,
  squadGranularEntitlements,
  proGranularEntitlements,
  championsGranularEntitlements,
  allFeaturesOn,
} from "@/lib/plan-entitlements";

/**
 * Single source of truth for commercial plan packaging.
 * Marketing (`Pricing.tsx`), client gates (`plan-limits.ts`), Stripe, Operator,
 * and catalogue seeds must all derive from this file.
 *
 * Formula: yearly = monthly × 12 × 0.8 (20% yearly discount).
 * Volume: −15% on the full bill when active members exceed the plan threshold (~80% of limit).
 */
export interface PlanCommercialConfig {
  id: PlanId;
  publicName: string;
  maxMembers: number;
  maxTeams: number;
  maxStorageMb: number;
  maxAdmins: number;
  /** null = fair use / unlimited trainers */
  maxTrainers: number | null;
  supportTier: SupportTier;
  /** Fixed platform fee billed each month / year. */
  basePrice: { monthly: number; yearly: number };
  /** Per active member fee. */
  memberPrice: { monthly: number; yearly: number };
  /** Apply 15% volume discount when member count is strictly greater than this. */
  discountThreshold: number;
  features: PlanFeatureMap;
  sortOrder: number;
  publicVisible: boolean;
  recommended: boolean;
  descriptionKey: string;
}

function yearlyFromMonthly(monthly: number): number {
  return Math.round(monthly * 12 * 0.8 * 100) / 100;
}

function pricePair(monthly: number): { monthly: number; yearly: number } {
  return { monthly, yearly: yearlyFromMonthly(monthly) };
}

export const VOLUME_DISCOUNT_PCT = 15;

/** Fair-use AI add-on for Kick-off / Squad; Pro+ includes AI in the plan. */
export const AI4T_ADDON_PRICE_MONTHLY = 19;

export const FOUNDING_CLUB_OFFER_CODE = "ONE4Team-Founding-Club-12M";
/** Previous public code — still accepted on onboarding URLs until links expire. */
export const FOUNDING_CLUB_OFFER_CODE_LEGACY = "founding-club-12-months-free";

export function isFoundingClubOfferCode(code: string | null | undefined): boolean {
  const normalized = (code ?? "").trim();
  return (
    normalized === FOUNDING_CLUB_OFFER_CODE ||
    normalized === FOUNDING_CLUB_OFFER_CODE_LEGACY
  );
}

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
    publicName: "Kick-off",
    maxMembers: 500,
    maxTeams: 10,
    maxStorageMb: 1024,
    maxAdmins: 3,
    maxTrainers: 10,
    supportTier: "self_service",
    basePrice: pricePair(19),
    memberPrice: pricePair(0.15),
    discountThreshold: 400,
    features: withLegacyAliases(kickoffGranularEntitlements({ chat: false })),
    sortOrder: 1,
    publicVisible: true,
    recommended: false,
    descriptionKey: "kickoff",
  },
  squad: {
    id: "squad",
    publicName: "Squad",
    maxMembers: 1000,
    maxTeams: 30,
    maxStorageMb: 10_240,
    maxAdmins: 5,
    maxTrainers: 50,
    supportTier: "standard_email",
    basePrice: pricePair(39),
    memberPrice: pricePair(0.25),
    discountThreshold: 800,
    features: withLegacyAliases(squadGranularEntitlements()),
    sortOrder: 2,
    publicVisible: true,
    recommended: false,
    descriptionKey: "squad",
  },
  pro: {
    id: "pro",
    publicName: "Pro",
    maxMembers: 2000,
    maxTeams: 100,
    maxStorageMb: 51_200,
    maxAdmins: 10,
    maxTrainers: 200,
    supportTier: "priority_email",
    basePrice: pricePair(79),
    memberPrice: pricePair(0.3),
    discountThreshold: 1600,
    features: withLegacyAliases(proGranularEntitlements()),
    sortOrder: 3,
    publicVisible: true,
    recommended: true,
    descriptionKey: "pro",
  },
  champions: {
    id: "champions",
    publicName: "Champions",
    maxMembers: 5000,
    maxTeams: 250,
    maxStorageMb: 153_600,
    maxAdmins: 25,
    maxTrainers: null,
    supportTier: "priority_sla",
    basePrice: pricePair(149),
    memberPrice: pricePair(0.4),
    discountThreshold: 4000,
    features: withLegacyAliases(championsGranularEntitlements()),
    sortOrder: 4,
    publicVisible: true,
    recommended: false,
    descriptionKey: "champions",
  },
};

export const BESPOKE_PLAN_LIMITS = {
  maxMembers: Infinity,
  maxTeams: Infinity,
  maxStorageMb: Infinity,
  maxAdmins: Infinity,
  maxTrainers: null as number | null,
  supportTier: "priority_sla" as SupportTier,
  features: withLegacyAliases(allFeaturesOn()),
} as const;

/** Snapshot of numeric caps for DB seed / drift tests (storage in MB). */
export const PLAN_CATALOG_SEED = {
  kickoff: {
    key: "kickoff",
    max_users: 500,
    max_teams: 10,
    max_storage_mb: 1024,
    max_admins: 3,
    max_trainers: 10,
    price_monthly: 19,
    price_yearly: yearlyFromMonthly(19),
  },
  squad: {
    key: "squad",
    max_users: 1000,
    max_teams: 30,
    max_storage_mb: 10_240,
    max_admins: 5,
    max_trainers: 50,
    price_monthly: 39,
    price_yearly: yearlyFromMonthly(39),
  },
  pro: {
    key: "pro",
    max_users: 2000,
    max_teams: 100,
    max_storage_mb: 51_200,
    max_admins: 10,
    max_trainers: 200,
    price_monthly: 79,
    price_yearly: yearlyFromMonthly(79),
  },
  champions: {
    key: "champions",
    max_users: 5000,
    max_teams: 250,
    max_storage_mb: 153_600,
    max_admins: 25,
    max_trainers: null as number | null,
    price_monthly: 149,
    price_yearly: yearlyFromMonthly(149),
  },
} as const;

export interface PlanPriceBreakdown {
  total: number;
  base: number;
  memberCost: number;
  discount: boolean;
  discountPct: number;
  effectivePerMember: number;
}

export function calculateCatalogPrice(
  planId: PlanId,
  memberCount: number,
  billing: "yearly" | "monthly",
): PlanPriceBreakdown {
  if (planId === "bespoke") {
    return {
      total: -1,
      base: 0,
      memberCost: 0,
      discount: false,
      discountPct: 0,
      effectivePerMember: 0,
    };
  }
  const plan = PLAN_CATALOG[planId];
  const base = plan.basePrice[billing];
  const memberCost = Math.max(0, memberCount) * plan.memberPrice[billing];
  let total = base + memberCost;
  const discount = memberCount > plan.discountThreshold;
  if (discount) total *= 1 - VOLUME_DISCOUNT_PCT / 100;
  const effectivePerMember = memberCount > 0 ? total / memberCount : total;
  return {
    total,
    base,
    memberCost,
    discount,
    discountPct: discount ? VOLUME_DISCOUNT_PCT : 0,
    effectivePerMember,
  };
}

/** Whether memberCount is within the plan's member profile limit. */
export function isPlanAvailableForMemberCount(planId: PlanId, memberCount: number): boolean {
  if (planId === "bespoke") return true;
  return memberCount <= PLAN_CATALOG[planId].maxMembers;
}

/**
 * Suggested plan for a club size.
 * 1–500 kickoff, 501–1000 squad, 1001–2000 pro, 2001–5000 champions, >5000 bespoke.
 */
export function suggestPlanForMemberCount(memberCount: number): PlanId {
  if (memberCount <= PLAN_CATALOG.kickoff.maxMembers) return "kickoff";
  if (memberCount <= PLAN_CATALOG.squad.maxMembers) return "squad";
  if (memberCount <= PLAN_CATALOG.pro.maxMembers) return "pro";
  if (memberCount <= PLAN_CATALOG.champions.maxMembers) return "champions";
  return "bespoke";
}

/** Kick-off with chat unlocked (paid Kick-off / grandfather / operator). */
export function kickoffPaidFeatures(): PlanFeatureMap {
  return withLegacyAliases(kickoffGranularEntitlements({ chat: true }));
}

export function storageMbToGbLabel(mb: number): string {
  const gb = mb / 1024;
  return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
}

/** First marketing bullet derived from catalogue (prevents EN/DE card drift). */
export function formatPlanMarketingLimits(
  planId: Exclude<PlanId, "bespoke">,
  locale: "en" | "de" = "en",
): string {
  const plan = PLAN_CATALOG[planId];
  const members = plan.maxMembers.toLocaleString(locale === "de" ? "de-DE" : "en-US");
  const teams = plan.maxTeams.toLocaleString(locale === "de" ? "de-DE" : "en-US");
  const admins = plan.maxAdmins.toLocaleString(locale === "de" ? "de-DE" : "en-US");
  const storage = storageMbToGbLabel(plan.maxStorageMb);
  const trainers =
    plan.maxTrainers == null
      ? locale === "de"
        ? "Trainer: Fair Use"
        : "trainers: fair use"
      : locale === "de"
        ? `${plan.maxTrainers} Trainer`
        : `${plan.maxTrainers} trainers`;

  if (locale === "de") {
    return `Bis zu ${members} Mitgliederprofile · ${teams} Teams · ${admins} Admins · ${trainers} · ${storage}`;
  }
  return `Up to ${members} member profiles · ${teams} teams · ${admins} admins · ${trainers} · ${storage}`;
}
