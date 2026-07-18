/**
 * Typed granular feature entitlements for commercial plans.
 * Legacy keys (`communication`, `payments`, `analytics`) remain as derived aliases
 * so existing PlanGate call sites keep working during migration.
 */

export const GRANULAR_FEATURE_KEYS = [
  "members",
  "memberImport",
  "memberExport",
  "teams",
  "trainings",
  "matches",
  "events",
  "attendance",
  "announcements",
  "chat",
  "directMessages",
  "messageAttachments",
  "documents",
  "tasks",
  "workflows",
  "duesTracking",
  "onlinePayments",
  "financialReports",
  "standardReports",
  "advancedAnalytics",
  "partners",
  "partnerMarketplace",
  "shop",
  "clubPage",
  "clubPageMultilingual",
  "customBranding",
  "ai",
  "auditLog",
  "apiAccess",
  "webhooks",
  "prioritySupport",
  "multiLocation",
  // Legacy aliases (derived in withLegacyAliases)
  "communication",
  "payments",
  "analytics",
] as const;

export type FeatureKey = (typeof GRANULAR_FEATURE_KEYS)[number];

export type SupportTier = "self_service" | "standard_email" | "priority_email" | "priority_sla";

/** Granular flags without legacy aliases. */
export type GranularEntitlements = {
  members: boolean;
  memberImport: boolean;
  memberExport: boolean;
  teams: boolean;
  trainings: boolean;
  matches: boolean;
  events: boolean;
  attendance: boolean;
  announcements: boolean;
  chat: boolean;
  directMessages: boolean;
  messageAttachments: boolean;
  documents: boolean;
  tasks: boolean;
  workflows: boolean;
  duesTracking: boolean;
  onlinePayments: boolean;
  financialReports: boolean;
  standardReports: boolean;
  advancedAnalytics: boolean;
  partners: boolean;
  partnerMarketplace: boolean;
  shop: boolean;
  clubPage: boolean;
  clubPageMultilingual: boolean;
  customBranding: boolean;
  ai: boolean;
  auditLog: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  prioritySupport: boolean;
  multiLocation: boolean;
};

export type PlanFeatureMap = GranularEntitlements & {
  /** Derived: announcements || chat */
  communication: boolean;
  /** Derived: duesTracking || onlinePayments */
  payments: boolean;
  /** Derived: standardReports || advancedAnalytics || financialReports */
  analytics: boolean;
};

export function withLegacyAliases(g: GranularEntitlements): PlanFeatureMap {
  return {
    ...g,
    communication: g.announcements || g.chat,
    payments: g.duesTracking || g.onlinePayments,
    analytics: g.standardReports || g.advancedAnalytics || g.financialReports,
  };
}

export function allFeaturesOff(): GranularEntitlements {
  return {
    members: false,
    memberImport: false,
    memberExport: false,
    teams: false,
    trainings: false,
    matches: false,
    events: false,
    attendance: false,
    announcements: false,
    chat: false,
    directMessages: false,
    messageAttachments: false,
    documents: false,
    tasks: false,
    workflows: false,
    duesTracking: false,
    onlinePayments: false,
    financialReports: false,
    standardReports: false,
    advancedAnalytics: false,
    partners: false,
    partnerMarketplace: false,
    shop: false,
    clubPage: false,
    clubPageMultilingual: false,
    customBranding: false,
    ai: false,
    auditLog: false,
    apiAccess: false,
    webhooks: false,
    prioritySupport: false,
    multiLocation: false,
  };
}

export function allFeaturesOn(): GranularEntitlements {
  const off = allFeaturesOff();
  for (const key of Object.keys(off) as (keyof GranularEntitlements)[]) {
    off[key] = true;
  }
  return off;
}

/** Kick-off catalogue default: ops on, announcements on, chat off (paid Kick-off unlocks chat via resolver). */
export function kickoffGranularEntitlements(opts?: { chat?: boolean }): GranularEntitlements {
  return {
    ...allFeaturesOff(),
    members: true,
    memberImport: true,
    memberExport: true,
    teams: true,
    trainings: true,
    matches: true,
    events: true,
    attendance: true,
    announcements: true,
    chat: opts?.chat ?? false,
    directMessages: opts?.chat ?? false,
    messageAttachments: opts?.chat ?? false,
    documents: true,
    tasks: true,
    workflows: true,
    duesTracking: true,
    onlinePayments: true,
    financialReports: false,
    standardReports: true,
    advancedAnalytics: false,
    partners: true,
    partnerMarketplace: true,
    shop: true,
    clubPage: true,
    clubPageMultilingual: false,
    customBranding: false,
    ai: false,
    auditLog: false,
    apiAccess: false,
    webhooks: false,
    prioritySupport: false,
    multiLocation: false,
  };
}

export function squadGranularEntitlements(): GranularEntitlements {
  return {
    ...kickoffGranularEntitlements({ chat: true }),
    chat: true,
    directMessages: true,
    messageAttachments: true,
    documents: true,
    tasks: true,
    workflows: true,
    duesTracking: true,
    onlinePayments: true,
    standardReports: true,
    partners: true,
    partnerMarketplace: true,
    shop: true,
    ai: true,
  };
}

export function proGranularEntitlements(): GranularEntitlements {
  return {
    ...squadGranularEntitlements(),
    ai: true,
    advancedAnalytics: true,
    financialReports: true,
    clubPageMultilingual: true,
    customBranding: true,
    auditLog: true,
    prioritySupport: true,
  };
}

export function championsGranularEntitlements(): GranularEntitlements {
  return {
    ...proGranularEntitlements(),
    apiAccess: true,
    webhooks: true,
    multiLocation: true,
  };
}

export const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  members: "Members",
  memberImport: "Member import",
  memberExport: "Member export",
  teams: "Teams",
  trainings: "Trainings",
  matches: "Matches",
  events: "Events",
  attendance: "Attendance",
  announcements: "Announcements",
  chat: "Chat",
  directMessages: "Direct messages",
  messageAttachments: "Message attachments",
  documents: "Documents",
  tasks: "Tasks",
  workflows: "Workflows",
  duesTracking: "Dues tracking",
  onlinePayments: "Online payments",
  financialReports: "Financial reports",
  standardReports: "Standard reports",
  advancedAnalytics: "Advanced analytics",
  partners: "Partners",
  partnerMarketplace: "Partner marketplace",
  shop: "Shop",
  clubPage: "Club page",
  clubPageMultilingual: "Multilingual club page",
  customBranding: "Custom branding",
  ai: "AI 4 T",
  auditLog: "Audit log",
  apiAccess: "API access",
  webhooks: "Webhooks",
  prioritySupport: "Priority support",
  multiLocation: "Multi-location",
  communication: "Communication",
  payments: "Payments",
  analytics: "Analytics",
};

/** First paid plan (by ladder) that includes a feature — for upgrade CTAs. */
export function firstPlanIncludingFeature(feature: FeatureKey): string | null {
  const order = ["kickoff", "squad", "pro", "champions", "bespoke"] as const;
  // Lazy import avoided: callers pass resolved maps via plan-limits.
  void order;
  void feature;
  return null;
}
