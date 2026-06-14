import { supabase } from "@/integrations/supabase/client";

export interface AdminDashboardSnapshot {
  membersActive: number;
  pendingDrafts: number;
  teamsCount: number;
  upcomingCount7d: number;
  unpaidDues: number;
  trainingsNext7d: number;
  upcomingMatches: number;
  completedMatches: number;
}

export interface DashboardUpcomingItem {
  title: string;
  time: string;
  type: string;
  startsAt: string;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || /\brelation\b.*\bdoes not exist\b/i.test(message);
}

/** Admin KPI snapshot — same sources as Reports admin overview. */
export async function fetchAdminDashboardSnapshot(clubId: string): Promise<AdminDashboardSnapshot> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in7Iso = new Date(now.getTime() + 7 * 86400000).toISOString();
  const nowIso = now.toISOString();

  const [
    memRes,
    draftRes,
    teamRes,
    matchUpcomingRes,
    matchCompletedRes,
    duesRes,
    trainRes,
    actRes,
    eventRes,
  ] = await Promise.all([
    supabase
      .from("club_memberships")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "active"),
    supabase
      .from("club_member_drafts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "draft"),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("club_id", clubId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("match_date", today)
      .neq("status", "cancelled"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "completed"),
    supabase
      .from("membership_dues")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "due"),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .ilike("type", "training")
      .gte("starts_at", nowIso)
      .lte("starts_at", in7Iso),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("starts_at", nowIso)
      .lte("starts_at", in7Iso),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("starts_at", nowIso)
      .lte("starts_at", in7Iso),
  ]);

  const membersActive = memRes.error ? 0 : memRes.count ?? 0;
  const pendingDrafts = draftRes.error && isMissingRelationError(draftRes.error) ? 0 : draftRes.count ?? 0;
  const teamsCount = teamRes.error ? 0 : teamRes.count ?? 0;
  const upcomingMatches = matchUpcomingRes.error ? 0 : matchUpcomingRes.count ?? 0;
  const completedMatches = matchCompletedRes.error ? 0 : matchCompletedRes.count ?? 0;
  const unpaidDues = duesRes.error && isMissingRelationError(duesRes.error) ? 0 : duesRes.count ?? 0;
  const trainingsNext7d = trainRes.error ? 0 : trainRes.count ?? 0;
  const activities7d = actRes.error ? 0 : actRes.count ?? 0;
  const events7d = eventRes.error && isMissingRelationError(eventRes.error) ? 0 : eventRes.count ?? 0;

  return {
    membersActive,
    pendingDrafts,
    teamsCount,
    upcomingCount7d: activities7d + events7d,
    unpaidDues,
    trainingsNext7d,
    upcomingMatches,
    completedMatches,
  };
}

function formatUpcomingTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

/** Next schedule items from activities, matches, and club events. */
export async function fetchDashboardUpcoming(clubId: string, days = 7): Promise<DashboardUpcomingItem[]> {
  const now = new Date();
  const toIso = new Date(now.getTime() + days * 86400000).toISOString();
  const nowIso = now.toISOString();
  const today = now.toISOString().slice(0, 10);
  const toDate = toIso.slice(0, 10);

  const [actRes, matchRes, eventRes] = await Promise.all([
    supabase
      .from("activities")
      .select("title, type, starts_at")
      .eq("club_id", clubId)
      .gte("starts_at", nowIso)
      .lte("starts_at", toIso)
      .order("starts_at", { ascending: true })
      .limit(12),
    supabase
      .from("matches")
      .select("opponent, match_date, status")
      .eq("club_id", clubId)
      .gte("match_date", today)
      .lte("match_date", toDate)
      .neq("status", "cancelled")
      .order("match_date", { ascending: true })
      .limit(8),
    supabase
      .from("events")
      .select("title, event_type, starts_at")
      .eq("club_id", clubId)
      .gte("starts_at", nowIso)
      .lte("starts_at", toIso)
      .order("starts_at", { ascending: true })
      .limit(8),
  ]);

  const items: DashboardUpcomingItem[] = [];

  for (const a of actRes.data ?? []) {
    const startsAt = String((a as { starts_at: string }).starts_at);
    items.push({
      title: String((a as { title: string }).title || "Activity"),
      type: String((a as { type: string }).type || "training"),
      startsAt,
      time: formatUpcomingTime(startsAt),
    });
  }

  for (const m of matchRes.data ?? []) {
    const date = String((m as { match_date: string }).match_date);
    const startsAt = `${date}T12:00:00`;
    items.push({
      title: `vs ${String((m as { opponent: string }).opponent || "TBD")}`,
      type: "match",
      startsAt,
      time: formatUpcomingTime(startsAt),
    });
  }

  if (!eventRes.error) {
    for (const e of eventRes.data ?? []) {
      const startsAt = String((e as { starts_at: string }).starts_at);
      items.push({
        title: String((e as { title: string }).title || "Event"),
        type: String((e as { event_type: string }).event_type || "event"),
        startsAt,
        time: formatUpcomingTime(startsAt),
      });
    }
  }

  return items
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 8);
}

export interface ClubSetupProfile {
  name: string;
  slug: string;
  clubCategory: string | null;
  description: string | null;
  address: string | null;
  website: string | null;
  timezone: string;
  defaultLanguage: string;
  isPublic: boolean;
  publicPagePublishedAt: string | null;
  publicPagePublishVersion: number;
}

type ClubSetupRow = {
  name: string;
  slug: string;
  club_category?: string | null;
  description: string | null;
  address: string | null;
  website: string | null;
  timezone: string;
  default_language: string;
  is_public: boolean;
  public_page_published_at: string | null;
  public_page_publish_version: number;
};

/** Live club profile for dashboard setup summary (Club Page + clubs row). */
export async function fetchClubSetupProfile(clubId: string): Promise<ClubSetupProfile | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select(
      "name, slug, club_category, description, address, website, timezone, default_language, is_public, public_page_published_at, public_page_publish_version",
    )
    .eq("id", clubId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ClubSetupRow;
  return {
    name: row.name,
    slug: row.slug,
    clubCategory: row.club_category?.trim() || null,
    description: row.description?.trim() || null,
    address: row.address?.trim() || null,
    website: row.website?.trim() || null,
    timezone: row.timezone,
    defaultLanguage: row.default_language,
    isPublic: row.is_public,
    publicPagePublishedAt: row.public_page_published_at,
    publicPagePublishVersion: row.public_page_publish_version ?? 0,
  };
}
