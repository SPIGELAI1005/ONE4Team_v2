import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  formatOverviewNumber,
  formatOverviewTimestamp,
  formatUsageEventName,
} from "@/lib/operator-formatters";

export interface OperatorClubDetailClub {
  id: string;
  name: string;
  slug: string;
  status: string;
  email: string | null;
  phone: string | null;
  is_public: boolean;
  public_page_published_at: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface OperatorClubDetailPlan {
  key: string;
  name: string;
  billing_status: string;
  billing_cycle: string;
}

export interface OperatorClubDetailMetrics {
  users: number;
  active_users: number;
  teams: number;
  events: number;
  matches: number;
}

export interface OperatorClubDetailModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  is_core: boolean;
  enabled: boolean;
  source: string;
  included_in_plan: boolean;
  valid_until: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string | null;
  entitlement_id: string | null;
}

export interface OperatorClubDetailActiveModule {
  key: string;
  name: string;
  source: string;
}

export interface OperatorClubDetailUser {
  membership_id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  last_active_at: string | null;
}

export interface OperatorClubDetailUsage {
  active_users: number;
  module_usage: number;
  events_created: number;
  matches_created: number;
  page_views: number | null;
  page_views_available: boolean;
}

export interface OperatorClubDetailActivity {
  id: string;
  action: string;
  actor_email: string | null;
  entity_type: string | null;
  created_at: string;
}

export interface OperatorClubDetailAudit extends OperatorClubDetailActivity {
  actor_role: string | null;
  entity_id: string | null;
  reason: string | null;
}

export interface OperatorClubDetail {
  club: OperatorClubDetailClub;
  plan: OperatorClubDetailPlan | null;
  public_url: string | null;
  metrics: OperatorClubDetailMetrics;
  active_modules: OperatorClubDetailActiveModule[];
  modules: OperatorClubDetailModule[];
  users: OperatorClubDetailUser[];
  usage: OperatorClubDetailUsage;
  recent_activity: OperatorClubDetailActivity[];
  audit: OperatorClubDetailAudit[];
  support_notes: unknown[];
  generated_at: string;
}

function assertNoRpcError(error: { message?: string } | null, fallbackMessage: string): void {
  if (error) throw new Error(error.message ?? fallbackMessage);
}

export async function getOperatorClubDetail(clubId: string): Promise<OperatorClubDetail> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_club_detail", {
    _club_id: clubId,
  });
  assertNoRpcError(error, "Unable to load operator club detail.");
  return data as OperatorClubDetail;
}

export interface OperatorClubListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_name: string | null;
  billing_status: string | null;
  created_at: string;
  updated_at: string;
}

export async function getOperatorClubs(): Promise<OperatorClubListItem[]> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_clubs");
  assertNoRpcError(error, "Unable to load operator clubs.");
  return (Array.isArray(data) ? data : []) as OperatorClubListItem[];
}

export { formatOverviewNumber, formatOverviewTimestamp };
