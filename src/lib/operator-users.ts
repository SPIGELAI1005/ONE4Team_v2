import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { Translations } from "@/i18n";
import type { OperatorRole } from "@/lib/operator-permissions";import {
  formatOverviewTimestamp,
  formatUsageEventName,
} from "@/lib/operator-formatters";

export type OperatorUserDetailLevel = "full" | "support" | "summary";
export type OperatorUserAccountStatus = "active" | "inactive" | "unassigned" | "platform_only";
export type OperatorUserInvitationStatus = "pending" | "accepted" | "expired" | "none";

export interface OperatorUserClubMembership {
  club_id: string;
  club_name: string;
  club_slug: string;
  role: string;
  status: string;
  membership_id: string;
  joined_at?: string;
}

export interface OperatorUserListEntry {
  user_id: string;
  display_name: string;
  email: string | null;
  clubs: OperatorUserClubMembership[];
  club_names: string;
  club_roles: string;
  platform_role: OperatorRole | null;
  platform_status: "ACTIVE" | "DISABLED" | null;
  status: OperatorUserAccountStatus;
  created_at: string;
  last_active_at: string;
  invitation_status: OperatorUserInvitationStatus;
}

export interface OperatorUserRecentActivity {
  id: string;
  event_name: string;
  module_key: string | null;
  route: string | null;
  club_name: string | null;
  created_at: string;
}

export interface OperatorUserRecentAudit {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  club_name: string | null;
  reason: string | null;
  created_at: string;
}

export interface OperatorUserDetail {
  user_id: string;
  display_name: string;
  email: string | null;
  created_at: string;
  last_active_at: string;
  platform_role: OperatorRole | null;
  platform_status: "ACTIVE" | "DISABLED" | null;
  status: OperatorUserAccountStatus;
  invitation_status: OperatorUserInvitationStatus;
  detail_level: OperatorUserDetailLevel;
  clubs: OperatorUserClubMembership[];
  recent_activity: OperatorUserRecentActivity[];
  recent_audit: OperatorUserRecentAudit[];
}

export interface OperatorUsersFilters {
  search?: string | null;
  clubId?: string | null;
  clubRole?: string | null;
  status?: OperatorUserAccountStatus | null;
  platformRole?: OperatorRole | "none" | null;
  lastActiveFrom?: string | null;
  lastActiveTo?: string | null;
  limit?: number;
  offset?: number;
}

export interface OperatorUsersResult {
  entries: OperatorUserListEntry[];
  total: number;
  limit: number;
  offset: number;
  detail_level: OperatorUserDetailLevel;
  facets: {
    statuses: OperatorUserAccountStatus[];
    platform_roles: Array<OperatorRole | "none">;
    club_roles: string[];
  };
}

export function getOperatorUserDetailLevel(role: OperatorRole | null): OperatorUserDetailLevel {
  if (role === "OWNER" || role === "OPERATOR") return "full";
  if (role === "SUPPORT") return "support";
  return "summary";
}

export function formatOperatorUserStatus(status: OperatorUserAccountStatus, t: Translations): string {
  return t.operator.users.statuses[status] ?? t.operator.users.statuses.unassigned;
}

export function formatOperatorInvitationStatus(status: OperatorUserInvitationStatus, t: Translations): string {
  return t.operator.users.invitations[status] ?? t.operator.users.invitations.none;
}

export function formatOperatorUserClubsSummary(
  clubs: OperatorUserClubMembership[],
  t: Translations,
  max = 2,
): string {
  if (clubs.length === 0) return "—";
  const names = clubs.map((club) => club.club_name);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} ${t.operator.users.clubsMore.replace("{count}", String(names.length - max))}`;
}
export function formatUsageEventLabel(eventName: string): string {
  return formatUsageEventName(eventName);
}

export { formatOverviewNumber, formatOverviewTimestamp } from "@/lib/operator-formatters";

export async function getOperatorUsers(filters: OperatorUsersFilters = {}): Promise<OperatorUsersResult> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_users", {
    _search: filters.search ?? null,
    _club_id: filters.clubId ?? null,
    _club_role: filters.clubRole ?? null,
    _status: filters.status ?? null,
    _platform_role: filters.platformRole ?? null,
    _last_active_from: filters.lastActiveFrom ?? null,
    _last_active_to: filters.lastActiveTo ?? null,
    _limit: filters.limit ?? 50,
    _offset: filters.offset ?? 0,
  });

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Operator users response was empty.");
  }

  return data as OperatorUsersResult;
}

export async function getOperatorUserDetail(userId: string): Promise<OperatorUserDetail> {
  const { data, error } = await supabaseDynamic.rpc("get_operator_user_detail", {
    _user_id: userId,
  });

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Operator user detail response was empty.");
  }

  return data as OperatorUserDetail;
}
