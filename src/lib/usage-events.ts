import { MODULE_ROUTES, type DashboardModule } from "@/lib/rbac-config";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { trackEvent } from "@/lib/telemetry";

export const USAGE_EVENT_NAMES = [
  "user_logged_in",
  "club_dashboard_opened",
  "public_club_page_viewed",
  "module_opened",
  "team_created",
  "event_created",
  "match_created",
  "training_created",
  "player_created",
  "invitation_sent",
  "marketplace_opened",
  "qr_code_scanned",
  "tournament_opened",
] as const;

export type UsageEventName = (typeof USAGE_EVENT_NAMES)[number];

export interface UsageEventMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export interface TrackUsageEventInput {
  eventName: UsageEventName;
  clubId?: string | null;
  moduleKey?: string | null;
  route?: string | null;
  metadata?: UsageEventMetadata;
}

export interface MostUsedModuleRow {
  module_key: string;
  event_count: number;
}

export interface ClubUsageSummary {
  club_id: string;
  active_users_last_7_days: number;
  active_users_last_30_days: number;
  module_opens_last_30_days: number;
  public_page_views_last_30_days: number;
  events_created: number;
  matches_created: number;
  teams_created: number;
  last_event_at: string | null;
}

export interface ModuleUsageByClubRow {
  club_id: string;
  club_name: string;
  module_key: string;
  event_count: number;
}

export interface RecentlyActiveClubRow {
  club_id: string;
  club_name: string;
  club_slug: string;
  last_activity_at: string;
  event_count: number;
}

const BLOCKED_METADATA_KEYS = new Set([
  "email",
  "password",
  "token",
  "name",
  "phone",
  "message",
  "content",
  "description",
  "invite_token",
]);

export function sanitizeUsageMetadata(metadata?: UsageEventMetadata): Record<string, string | number | boolean | null> {
  if (!metadata) return {};

  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || BLOCKED_METADATA_KEYS.has(normalizedKey)) continue;
    if (value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[normalizedKey] = value;
    }
  }
  return sanitized;
}

export function resolveDashboardModuleFromPath(pathname: string): DashboardModule | null {
  const normalized = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  const entries = Object.entries(MODULE_ROUTES) as Array<[DashboardModule, string]>;
  entries.sort((left, right) => right[1].length - left[1].length);

  for (const [module, route] of entries) {
    if (normalized === route || normalized.startsWith(`${route}/`)) {
      return module;
    }
  }

  return null;
}

export function trackUsageEvent(input: TrackUsageEventInput): void {
  const metadata = sanitizeUsageMetadata(input.metadata);

  trackEvent(input.eventName, {
    clubId: input.clubId ?? null,
    moduleKey: input.moduleKey ?? null,
    route: input.route ?? null,
    ...metadata,
  });

  void (async () => {
    try {
      const { error } = await supabaseDynamic.rpc("append_usage_event", {
        _event_name: input.eventName,
        _club_id: input.clubId ?? null,
        _module_key: input.moduleKey ?? null,
        _route: input.route ?? null,
        _metadata_json: metadata,
      });
      if (error && import.meta.env.DEV) {
        console.warn("[usage-events]", input.eventName, error.message);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        const message = error instanceof Error ? error.message : "Unknown usage tracking error";
        console.warn("[usage-events]", input.eventName, message);
      }
    }
  })();
}

export async function getActiveUsersLast7Days(): Promise<number | null> {
  const { data, error } = await supabaseDynamic.rpc("get_active_users_last_7_days");
  if (error) throw error;
  return typeof data === "number" ? data : null;
}

export async function getActiveUsersLast30Days(): Promise<number | null> {
  const { data, error } = await supabaseDynamic.rpc("get_active_users_last_30_days");
  if (error) throw error;
  return typeof data === "number" ? data : null;
}

export async function getMostUsedModules(limit = 10): Promise<MostUsedModuleRow[]> {
  const { data, error } = await supabaseDynamic.rpc("get_most_used_modules", { _limit: limit });
  if (error) throw error;
  return Array.isArray(data) ? (data as MostUsedModuleRow[]) : [];
}

export async function getClubUsageSummary(clubId: string): Promise<ClubUsageSummary | null> {
  const { data, error } = await supabaseDynamic.rpc("get_club_usage_summary", { _club_id: clubId });
  if (error) throw error;
  return data && typeof data === "object" ? (data as ClubUsageSummary) : null;
}

export async function getModuleUsageByClub(limit = 50): Promise<ModuleUsageByClubRow[]> {
  const { data, error } = await supabaseDynamic.rpc("get_module_usage_by_club", { _limit: limit });
  if (error) throw error;
  return Array.isArray(data) ? (data as ModuleUsageByClubRow[]) : [];
}

export async function getRecentlyActiveClubs(limit = 10): Promise<RecentlyActiveClubRow[]> {
  const { data, error } = await supabaseDynamic.rpc("get_recently_active_clubs", { _limit: limit });
  if (error) throw error;
  return Array.isArray(data) ? (data as RecentlyActiveClubRow[]) : [];
}
