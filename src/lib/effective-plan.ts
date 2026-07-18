import { calculateCatalogPrice, PLAN_CATALOG } from "@/lib/plan-catalog";
import type { PlanId } from "@/lib/stripe";
import {
  getKickoffPaidLimits,
  getPlanLimits,
  NO_PLAN_LIMITS,
  type FeatureKey,
  type PlanLimits,
  isFeatureInLimits,
} from "@/lib/plan-limits";

export type AccessSource =
  | "stripe"
  | "standard_trial"
  | "commercial_offer"
  | "operator_grant"
  | "legacy"
  | "none";

export type EffectiveAccessStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "promotional"
  | "grace"
  | "expired"
  | "cancelled"
  | "none";

export interface ModuleOverride {
  moduleKey: string;
  enabled: boolean;
}

export interface EffectivePlanInput {
  planId: string | null | undefined;
  status: string | null | undefined;
  accessSource?: AccessSource | string | null;
  /** Grandfather: keep prior full Kick-off entitlements (incl. chat) until change/renew. */
  grandfatherKickoff?: boolean;
  /** Operator forced full access or per-module overrides. */
  operatorFullAccess?: boolean;
  moduleOverrides?: ModuleOverride[];
  /** Active Founding Club / commercial offer (promotional Kick-off). */
  commercialOfferActive?: boolean;
  /** In grace period after offer expiry. */
  inGracePeriod?: boolean;
  /** Offer/subscription expired without conversion. */
  expired?: boolean;
}

export interface EffectivePlanResult {
  planId: PlanId | "no_plan";
  accessSource: AccessSource;
  status: EffectiveAccessStatus;
  limits: PlanLimits;
  writeAccess: boolean;
  isPromotional: boolean;
  isGrandfathered: boolean;
}

const FEATURE_TO_MODULE: Partial<Record<FeatureKey, string>> = {
  members: "members",
  teams: "teams",
  matches: "matches",
  events: "events",
  trainings: "trainings",
  announcements: "communication",
  chat: "communication",
  communication: "communication",
  tasks: "tasks",
  documents: "documents",
  duesTracking: "payments",
  onlinePayments: "payments",
  payments: "payments",
  partners: "partners",
  partnerMarketplace: "marketplace",
  shop: "shop",
  clubPage: "club_page",
  ai: "ai",
  analytics: "analytics",
  financialReports: "analytics",
  advancedAnalytics: "analytics",
  standardReports: "analytics",
};

function normalizeStatus(status: string | null | undefined): EffectiveAccessStatus {
  const s = (status ?? "").toLowerCase();
  if (s === "promotional") return "promotional";
  if (s === "grace") return "grace";
  if (s === "trialing") return "trialing";
  if (s === "active") return "active";
  if (s === "past_due") return "past_due";
  if (s === "expired") return "expired";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "none";
}

function applyModuleOverrides(limits: PlanLimits, overrides: ModuleOverride[] | undefined): PlanLimits {
  if (!overrides?.length) return limits;
  const features = { ...limits.features };
  for (const ov of overrides) {
    for (const [feature, moduleKey] of Object.entries(FEATURE_TO_MODULE)) {
      if (moduleKey === ov.moduleKey) {
        (features as Record<string, boolean>)[feature] = ov.enabled;
      }
    }
    // Direct feature key overrides
    if (ov.moduleKey in features) {
      (features as Record<string, boolean>)[ov.moduleKey] = ov.enabled;
    }
  }
  // Re-derive legacy aliases
  features.communication = features.announcements || features.chat;
  features.payments = features.duesTracking || features.onlinePayments;
  features.analytics =
    features.standardReports || features.advancedAnalytics || features.financialReports;
  return { ...limits, features };
}

/**
 * Resolve effective limits for a club subscription + offer + operator state.
 */
export function resolveEffectivePlan(input: EffectivePlanInput): EffectivePlanResult {
  if (input.expired && !input.inGracePeriod && !input.operatorFullAccess) {
    return {
      planId: "no_plan",
      accessSource: "none",
      status: "expired",
      limits: NO_PLAN_LIMITS,
      writeAccess: false,
      isPromotional: false,
      isGrandfathered: false,
    };
  }

  if (input.operatorFullAccess) {
    const limits = getPlanLimits("bespoke");
    return {
      planId: "bespoke",
      accessSource: "operator_grant",
      status: "active",
      limits: applyModuleOverrides(limits, input.moduleOverrides),
      writeAccess: !input.inGracePeriod,
      isPromotional: false,
      isGrandfathered: false,
    };
  }

  const status = normalizeStatus(input.status);
  const accessSource = (input.accessSource as AccessSource) ||
    (input.commercialOfferActive ? "commercial_offer" : status === "trialing" ? "standard_trial" : input.planId ? "stripe" : "none");

  if (input.inGracePeriod) {
    const basePlan = (input.planId && input.planId in PLAN_CATALOG ? input.planId : "kickoff") as PlanId;
    const limits = applyModuleOverrides(getPlanLimits(basePlan), input.moduleOverrides);
    return {
      planId: basePlan,
      accessSource: accessSource === "none" ? "commercial_offer" : accessSource,
      status: "grace",
      limits,
      writeAccess: false,
      isPromotional: accessSource === "commercial_offer",
      isGrandfathered: false,
    };
  }

  // Active commercial offer = promotional Kick-off (announcements only unless overridden)
  if (input.commercialOfferActive || status === "promotional" || accessSource === "commercial_offer") {
    let limits = getPlanLimits("kickoff");
    limits = applyModuleOverrides(limits, input.moduleOverrides);
    return {
      planId: "kickoff",
      accessSource: "commercial_offer",
      status: "promotional",
      limits,
      writeAccess: true,
      isPromotional: true,
      isGrandfathered: false,
    };
  }

  // Grandfathered kickoff (chat unlocked)
  if (input.grandfatherKickoff && (input.planId === "kickoff" || !input.planId)) {
    let limits = getKickoffPaidLimits();
    limits = applyModuleOverrides(limits, input.moduleOverrides);
    return {
      planId: "kickoff",
      accessSource: "legacy",
      status: status === "none" ? "active" : status,
      limits,
      writeAccess: true,
      isPromotional: false,
      isGrandfathered: true,
    };
  }

  // Paid / trial plan from billing
  if (input.planId && (status === "active" || status === "trialing" || status === "past_due")) {
    let limits = getPlanLimits(input.planId);
    // Paid Kick-off unlocks chat
    if (input.planId === "kickoff" && (accessSource === "stripe" || status === "active" || status === "past_due")) {
      if (status !== "trialing" || accessSource === "stripe") {
        limits = getKickoffPaidLimits();
      }
    }
    // Standard trial on kickoff without grandfather → catalogue (announcements-only) unless stripe active
    if (input.planId === "kickoff" && status === "active" && accessSource === "stripe") {
      limits = getKickoffPaidLimits();
    }
    limits = applyModuleOverrides(limits, input.moduleOverrides);
    return {
      planId: (input.planId in PLAN_CATALOG || input.planId === "bespoke"
        ? input.planId
        : "no_plan") as PlanId | "no_plan",
      accessSource: status === "trialing" ? "standard_trial" : accessSource === "none" ? "stripe" : accessSource,
      status,
      limits: input.planId === "bespoke" ? applyModuleOverrides(getPlanLimits("bespoke"), input.moduleOverrides) : limits,
      writeAccess: status !== "past_due", // past_due still writable until portal recovery; adjust if needed
      isPromotional: false,
      isGrandfathered: false,
    };
  }

  // Explicit plan id with active-ish source
  if (input.planId && getPlanLimits(input.planId) !== NO_PLAN_LIMITS && !getPlanLimits(input.planId).isNoPlan) {
    let limits = getPlanLimits(input.planId);
    if (input.planId === "kickoff" && accessSource === "stripe") {
      limits = getKickoffPaidLimits();
    }
    limits = applyModuleOverrides(limits, input.moduleOverrides);
    return {
      planId: input.planId as PlanId,
      accessSource: accessSource === "none" ? "stripe" : accessSource,
      status: status === "none" ? "active" : status,
      limits,
      writeAccess: true,
      isPromotional: false,
      isGrandfathered: false,
    };
  }

  return {
    planId: "no_plan",
    accessSource: "none",
    status: "none",
    limits: applyModuleOverrides(NO_PLAN_LIMITS, input.moduleOverrides),
    writeAccess: false,
    isPromotional: false,
    isGrandfathered: false,
  };
}

export function canUseEffectiveFeature(result: EffectivePlanResult, feature: FeatureKey): boolean {
  return isFeatureInLimits(result.limits, feature);
}

/** Potential Kick-off MRR for a promotional club (catalog formula, not current revenue). */
export function potentialKickoffMrr(memberCount: number): number {
  return calculateCatalogPrice("kickoff", memberCount, "monthly").total;
}
