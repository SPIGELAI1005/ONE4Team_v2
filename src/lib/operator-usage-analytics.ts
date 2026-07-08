import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  formatOverviewNumber,
  formatOverviewTimestamp,
  formatUsageEventName,
} from "@/lib/operator-formatters";

export interface OperatorUsageAnalyticsFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  clubId?: string | null;
  moduleKey?: string | null;
  planKey?: string | null;
  limit?: number;
}

export interface OperatorUsageClubRow {
  club_id: string;
  club_name: string;
  club_slug: string;
  event_count?: number;
  last_activity_at: string;
}

export interface OperatorUsageModuleRow {
  module_key: string;
  module_name: string;
  event_count: number;
}

export interface OperatorUsageModuleByPlanRow {
  plan_key: string;
  plan_name: string;
  module_key: string;
  module_name: string;
  event_count: number;
}

export interface OperatorUsageModuleByClubRow {
  club_id: string;
  club_name: string;
  module_key: string;
  module_name: string;
  event_count: number;
}

export interface OperatorUsageRecentEventRow {
  id: string;
  event_name: string;
  module_key: string | null;
  route: string | null;
  created_at: string;
  club_name: string | null;
}

export interface OperatorUsageFeatureAdoption {
  total_active_clubs: number;
  public_club_page: {
    clubs_with_usage: number;
    clubs_published: number;
  };
  marketplace: { clubs_count: number };
  tournament: { clubs_count: number };
  qr_code: { clubs_count: number };
  partner_management: { clubs_count: number };
}

export interface OperatorUsageAnalytics {
  generated_at: string;
  filters: {
    date_from: string;
    date_to: string;
    club_id: string | null;
    module_key: string | null;
    plan_key: string | null;
    limit: number;
  };
  active_users: {
    last_24_hours: number;
    last_7_days: number;
    last_30_days: number;
    new_users_last_30_days: number;
  };
  club_activity: {
    most_active_clubs: OperatorUsageClubRow[];
    recently_active_clubs: OperatorUsageClubRow[];
    inactive_clubs: OperatorUsageClubRow[];
    no_activity_30_days_count: number;
  };
  module_usage: {
    most_used: OperatorUsageModuleRow[];
    least_used: OperatorUsageModuleRow[];
    by_plan: OperatorUsageModuleByPlanRow[];
    by_club: OperatorUsageModuleByClubRow[];
  };
  feature_adoption: OperatorUsageFeatureAdoption;
  tables: {
    top_clubs: OperatorUsageClubRow[];
    top_modules: OperatorUsageModuleRow[];
    recent_events: OperatorUsageRecentEventRow[];
  };
}

export function formatAdoptionRate(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export async function getOperatorUsageAnalytics(
  filters: OperatorUsageAnalyticsFilters = {},
): Promise<OperatorUsageAnalytics> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_usage_analytics", {
    _date_from: filters.dateFrom ?? null,
    _date_to: filters.dateTo ?? null,
    _club_id: filters.clubId ?? null,
    _module_key: filters.moduleKey ?? null,
    _plan_key: filters.planKey ?? null,
    _limit: filters.limit ?? 10,
  });

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Usage analytics response was empty.");
  }

  return data as OperatorUsageAnalytics;
}

export { formatOverviewNumber, formatOverviewTimestamp, formatUsageEventName };
