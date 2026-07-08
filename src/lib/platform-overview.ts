import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { Translations } from "@/i18n";

export interface OperatorOverviewMetricModule {
  key: string;
  name: string;
  usage_count: number;
}

export interface OperatorOverviewMetrics {
  total_clubs: number;
  active_clubs: number;
  trial_clubs: number;
  paying_clubs: number;
  suspended_clubs: number;
  total_users: number;
  active_users_last_7_days: number;
  total_teams: number;
  total_events: number;
  total_matches: number;
  most_used_module: OperatorOverviewMetricModule | null;
  recent_issues: number;
}

export interface OperatorOverviewHealth {
  label: string;
  status: "operational" | "attention" | "degraded";
  description: string;
}

export interface OperatorOverviewClub {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OperatorOverviewAudit {
  id: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string | null;
  entity_id: string | null;
  club_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface OperatorOverviewIssue {
  id: string;
  title: string;
  source: string;
  severity: string;
  status: string;
  club_id: string;
  created_at: string;
  last_seen_at: string;
}

export interface OperatorPlatformOverview {
  metrics: OperatorOverviewMetrics;
  health: OperatorOverviewHealth[];
  recent_created_clubs: OperatorOverviewClub[];
  recent_active_clubs: OperatorOverviewClub[];
  module_usage: OperatorOverviewMetricModule[];
  recent_audit: OperatorOverviewAudit[];
  recent_issues: OperatorOverviewIssue[];
  generated_at: string;
}

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

/**
 * Health rows are produced by the overview RPC with hardcoded English labels.
 * Map them to localized copy by their stable English label so the operator UI
 * renders in the selected language.
 */
export function localizeOverviewHealth(
  item: OperatorOverviewHealth,
  t: Translations,
): { label: string; description: string } {
  const items = t.operator.overview.health.items;
  const isAttention = item.status !== "operational";

  switch (item.label) {
    case "Platform access":
      return { label: items.platformAccess.label, description: items.platformAccess.operational };
    case "Billing":
      return {
        label: items.billing.label,
        description: isAttention ? items.billing.attention : items.billing.operational,
      };
    case "Issues":
      return {
        label: items.issues.label,
        description: isAttention ? items.issues.attention : items.issues.operational,
      };
    default:
      return { label: item.label, description: item.description };
  }
}

export function formatOverviewNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export function formatOverviewTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function getOperatorPlatformOverview(): Promise<OperatorPlatformOverview> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_platform_overview");
  assertNoRpcError(error, "Unable to load platform overview.");
  return data as OperatorPlatformOverview;
}
