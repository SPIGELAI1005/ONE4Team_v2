import type { PlanId } from "@/lib/stripe";
import type { FeatureKey } from "@/lib/plan-entitlements";
import { PLAN_CATALOG, BESPOKE_PLAN_LIMITS } from "@/lib/plan-catalog";

export type ComparisonValue = "included" | "not_included" | "basic" | "advanced" | "addon" | "custom" | number | string;

export interface ComparisonRow {
  key: string;
  category:
    | "club_management"
    | "team_operations"
    | "communication"
    | "finance"
    | "public_presence"
    | "ai_analytics"
    | "support"
    | "security_integrations";
  /** Optional feature key — resolved from catalogue when set. */
  feature?: FeatureKey;
  /** Static values when not driven by a boolean feature. */
  values?: Partial<Record<PlanId, ComparisonValue>>;
}

function feat(feature: FeatureKey, category: ComparisonRow["category"], key: string): ComparisonRow {
  return { key, category, feature };
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  feat("members", "club_management", "memberProfiles"),
  feat("memberImport", "club_management", "memberImport"),
  feat("teams", "team_operations", "teams"),
  feat("trainings", "team_operations", "trainings"),
  feat("matches", "team_operations", "matches"),
  feat("events", "team_operations", "events"),
  feat("attendance", "team_operations", "attendance"),
  feat("announcements", "communication", "announcements"),
  feat("chat", "communication", "chat"),
  feat("messageAttachments", "communication", "attachments"),
  feat("documents", "communication", "documents"),
  feat("tasks", "club_management", "tasks"),
  feat("duesTracking", "finance", "dues"),
  feat("onlinePayments", "finance", "onlinePayments"),
  feat("financialReports", "finance", "financialReports"),
  feat("standardReports", "ai_analytics", "standardReports"),
  feat("advancedAnalytics", "ai_analytics", "advancedAnalytics"),
  feat("partners", "finance", "partners"),
  feat("partnerMarketplace", "finance", "marketplace"),
  feat("shop", "finance", "shop"),
  feat("clubPage", "public_presence", "clubPage"),
  feat("clubPageMultilingual", "public_presence", "multilingual"),
  feat("customBranding", "public_presence", "customBranding"),
  feat("ai", "ai_analytics", "ai"),
  feat("auditLog", "security_integrations", "auditLog"),
  feat("apiAccess", "security_integrations", "api"),
  feat("webhooks", "security_integrations", "webhooks"),
  feat("prioritySupport", "support", "prioritySupport"),
  feat("multiLocation", "security_integrations", "multiLocation"),
  {
    key: "maxMembers",
    category: "club_management",
    values: {
      kickoff: PLAN_CATALOG.kickoff.maxMembers,
      squad: PLAN_CATALOG.squad.maxMembers,
      pro: PLAN_CATALOG.pro.maxMembers,
      champions: PLAN_CATALOG.champions.maxMembers,
      bespoke: "custom",
    },
  },
  {
    key: "maxTeams",
    category: "team_operations",
    values: {
      kickoff: PLAN_CATALOG.kickoff.maxTeams,
      squad: PLAN_CATALOG.squad.maxTeams,
      pro: PLAN_CATALOG.pro.maxTeams,
      champions: PLAN_CATALOG.champions.maxTeams,
      bespoke: "custom",
    },
  },
  {
    key: "storageGb",
    category: "club_management",
    values: {
      kickoff: 1,
      squad: 10,
      pro: 50,
      champions: 150,
      bespoke: "custom",
    },
  },
];

export function resolveComparisonValue(row: ComparisonRow, planId: PlanId): ComparisonValue {
  if (row.values && planId in row.values) {
    return row.values[planId] as ComparisonValue;
  }
  if (row.feature) {
    const features =
      planId === "bespoke" ? BESPOKE_PLAN_LIMITS.features : PLAN_CATALOG[planId as Exclude<PlanId, "bespoke">].features;
    return features[row.feature] ? "included" : "not_included";
  }
  return "not_included";
}
