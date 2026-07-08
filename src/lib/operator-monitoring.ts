import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { Translations } from "@/i18n";
import { formatOverviewNumber, formatOverviewTimestamp } from "@/lib/platform-overview";

export type OperatorHealthStatus = "operational" | "attention" | "degraded";

export interface OperatorIntegrationStatus {
  connected: boolean;
  label: string;
}

export interface OperatorMetricSlot<T = number | null> {
  connected: boolean;
  value: T;
}

export interface OperatorPerformanceOverview {
  generated_at: string;
  app_status: OperatorHealthStatus;
  app_status_description: string;
  signals: {
    open_abuse_alerts: number;
    high_severity_open_abuse_alerts: number;
    past_due_billing_subscriptions: number;
  };
  integrations: {
    vercel: OperatorIntegrationStatus;
    supabase_metrics: OperatorIntegrationStatus;
    sentry: OperatorIntegrationStatus;
    custom_logs: OperatorIntegrationStatus;
  };
  last_deployment: {
    connected: boolean;
    deployed_at: string | null;
    environment: string | null;
    source: string;
  };
  metrics: {
    avg_page_load_ms: OperatorMetricSlot;
    api_error_rate: OperatorMetricSlot;
    database_response_ms: OperatorMetricSlot<number>;
    database_size_bytes: OperatorMetricSlot<number>;
  };
  slowest_routes: {
    connected: boolean;
    items: Array<{ route: string; avg_ms: number }>;
  };
}

export interface OperatorIssueRow {
  id: string;
  title: string;
  source: string;
  severity: string;
  status: string;
  club_id: string;
  club_name: string;
  created_at: string;
  last_seen_at: string;
}

export interface OperatorFailedNotificationRow {
  id: string;
  club_id: string;
  club_name: string;
  status: string;
  last_error: string | null;
  created_at: string;
}

export interface OperatorIssuesOverview {
  generated_at: string;
  integrations: {
    sentry: OperatorIntegrationStatus;
    vercel_logs: OperatorIntegrationStatus;
    supabase_logs: OperatorIntegrationStatus;
    email_delivery: OperatorIntegrationStatus;
  };
  summary: {
    open_technical_issues: number;
    failed_notification_events_7d: number;
    failed_api_requests_24h: number | null;
    failed_invite_delivery_7d: number | null;
    database_warnings: number;
  };
  recent_errors: { connected: boolean; items: unknown[] };
  failed_api_requests: { connected: boolean; items: unknown[] };
  failed_email_delivery: { connected: boolean; items: unknown[]; hint: string };
  database_warnings: { connected: boolean; items: unknown[] };
  open_technical_issues: OperatorIssueRow[];
  failed_notification_events: OperatorFailedNotificationRow[];
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatHealthStatus(status: OperatorHealthStatus, t: Translations): string {
  return t.operator.performance.health[status];
}

const PERFORMANCE_STATUS_DESCRIPTION_KEYS = {
  "Core platform signals look healthy.": "healthy",
  "High-severity open abuse alerts require attention.": "degradedHighSeverity",
  "Open abuse alerts and past-due billing subscriptions need review.": "attentionBoth",
  "Open abuse alerts are present on the platform.": "attentionAbuse",
  "Some billing subscriptions are past due.": "attentionBilling",
} as const;

export function localizePerformanceStatusDescription(description: string, t: Translations): string {
  const key =
    PERFORMANCE_STATUS_DESCRIPTION_KEYS[description as keyof typeof PERFORMANCE_STATUS_DESCRIPTION_KEYS];
  if (key) return t.operator.performance.statusDescriptions[key];
  return description;
}

export function localizePerformanceIntegrationLabel(key: string, t: Translations): string {
  const labels = t.operator.performance.integrationLabels;
  if (key in labels) return labels[key as keyof typeof labels];
  return key;
}

const ISSUES_EMAIL_DELIVERY_HINT_KEYS = {
  "Invite and transactional email delivery monitoring is not connected yet.": "emailNotConnected",
} as const;

export function localizeIssuesIntegrationLabel(key: string, t: Translations): string {
  const labels = t.operator.issues.integrationLabels;
  if (key in labels) return labels[key as keyof typeof labels];
  return key;
}

export function localizeIssuesEmailDeliveryHint(hint: string, t: Translations): string {
  const key =
    ISSUES_EMAIL_DELIVERY_HINT_KEYS[hint as keyof typeof ISSUES_EMAIL_DELIVERY_HINT_KEYS];
  if (key) return t.operator.issues.emailDeliveryHints[key];
  return hint;
}

export function localizeIssueSource(source: string, t: Translations): string {
  const sources = t.operator.issues.sources;
  if (source in sources) return sources[source as keyof typeof sources];
  return source;
}

export function healthStatusTone(status: OperatorHealthStatus): "default" | "success" | "warning" | "danger" {
  if (status === "operational") return "success";
  if (status === "attention") return "warning";
  return "danger";
}

export async function getOperatorPerformanceOverview(): Promise<OperatorPerformanceOverview> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_performance_overview");
  if (error) throw error;
  if (!data || typeof data !== "object") throw new Error("Performance overview response was empty.");
  return data as OperatorPerformanceOverview;
}

export async function getOperatorIssuesOverview(): Promise<OperatorIssuesOverview> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_issues_overview");
  if (error) throw error;
  if (!data || typeof data !== "object") throw new Error("Issues overview response was empty.");
  return data as OperatorIssuesOverview;
}

export { formatOverviewNumber, formatOverviewTimestamp };
