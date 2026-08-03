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

/** Admin KPI snapshot - same sources as Reports admin overview. */
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

/** Club-wide schedule for generic members - club events only (no team trainings or matches). */
export async function fetchClubWideDashboardUpcoming(
  clubId: string,
  days = 7,
): Promise<DashboardUpcomingItem[]> {
  const now = new Date();
  const toIso = new Date(now.getTime() + days * 86400000).toISOString();
  const nowIso = now.toISOString();

  const eventRes = await supabase
    .from("events")
    .select("title, event_type, starts_at")
    .eq("club_id", clubId)
    .gte("starts_at", nowIso)
    .lte("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(12);

  if (eventRes.error) return [];

  return (eventRes.data ?? []).map((e) => {
    const startsAt = String((e as { starts_at: string }).starts_at);
    return {
      title: String((e as { title: string }).title || "Event"),
      type: String((e as { event_type: string }).event_type || "event"),
      startsAt,
      time: formatUpcomingTime(startsAt),
    };
  });
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

export interface TeamScopedDashboardSnapshot {
  rosterCount: number;
  sessionsThisWeek: number;
  upcomingMatches: number;
  completedMatches: number;
  clubEvents7d: number;
  nextTrainingLabel: string | null;
  nextMatchLabel: string | null;
}

function applyTeamFilter<T extends { team_id?: string | null }>(
  teamIds: string[] | "all",
  rows: T[],
): T[] {
  if (teamIds === "all") return rows;
  if (teamIds.length === 0) return [];
  const allowed = new Set(teamIds);
  return rows.filter((row) => row.team_id != null && allowed.has(row.team_id));
}

/** Team-scoped KPI snapshot for trainer, player, parent, and team staff dashboards. */
export async function fetchTeamScopedDashboardSnapshot(
  clubId: string,
  teamIds: string[] | "all",
): Promise<TeamScopedDashboardSnapshot> {
  const empty: TeamScopedDashboardSnapshot = {
    rosterCount: 0,
    sessionsThisWeek: 0,
    upcomingMatches: 0,
    completedMatches: 0,
    clubEvents7d: 0,
    nextTrainingLabel: null,
    nextMatchLabel: null,
  };

  if (teamIds !== "all" && teamIds.length === 0) return empty;

  const now = new Date();
  const nowIso = now.toISOString();
  const in7Iso = new Date(now.getTime() + 7 * 86400000).toISOString();
  const today = now.toISOString().slice(0, 10);

  const teamFilter = teamIds === "all" ? null : teamIds;

  const rosterPromise = teamFilter
    ? supabase.from("team_players").select("membership_id").in("team_id", teamFilter)
    : supabase
        .from("club_memberships")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "active");

  const trainQuery = supabase
    .from("activities")
    .select("id, title, starts_at, team_id")
    .eq("club_id", clubId)
    .eq("type", "training")
    .gte("starts_at", nowIso)
    .lte("starts_at", in7Iso)
    .order("starts_at", { ascending: true })
    .limit(40);

  const matchUpcomingQuery = supabase
    .from("matches")
    .select("id, opponent, match_date, team_id")
    .eq("club_id", clubId)
    .gte("match_date", today)
    .neq("status", "cancelled")
    .order("match_date", { ascending: true })
    .limit(20);

  const matchCompletedQuery = teamFilter
    ? supabase
        .from("matches")
        .select("id, team_id")
        .eq("club_id", clubId)
        .eq("status", "completed")
        .in("team_id", teamFilter)
    : supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "completed");

  const eventResPromise = supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .gte("starts_at", nowIso)
    .lte("starts_at", in7Iso);

  const [rosterRes, trainRes, matchUpcomingRes, matchCompletedRes, eventRes] = await Promise.all([
    rosterPromise,
    trainQuery,
    matchUpcomingQuery,
    matchCompletedQuery,
    eventResPromise,
  ]);

  const scopedTrainings = applyTeamFilter(teamIds, (trainRes.data ?? []) as Array<{ team_id?: string | null }>);
  const scopedUpcomingMatches = applyTeamFilter(
    teamIds,
    (matchUpcomingRes.data ?? []) as Array<{ opponent?: string; match_date?: string; team_id?: string | null }>,
  );

  let rosterCount = 0;
  if (teamFilter) {
    const ids = new Set(
      ((rosterRes.data ?? []) as Array<{ membership_id: string }>).map((row) => row.membership_id),
    );
    rosterCount = ids.size;
  } else if (!rosterRes.error) {
    rosterCount = rosterRes.count ?? 0;
  }

  const nextTraining = scopedTrainings[0] as { title?: string; starts_at?: string } | undefined;
  const nextMatch = scopedUpcomingMatches[0] as { opponent?: string; match_date?: string } | undefined;

  let completedMatches = 0;
  if (teamFilter) {
    completedMatches = (matchCompletedRes.data ?? []).length;
  } else if (!matchCompletedRes.error) {
    completedMatches = matchCompletedRes.count ?? 0;
  }

  const clubEvents7d = eventRes.error && isMissingRelationError(eventRes.error) ? 0 : eventRes.count ?? 0;

  return {
    rosterCount,
    sessionsThisWeek: scopedTrainings.length,
    upcomingMatches: scopedUpcomingMatches.length,
    completedMatches,
    clubEvents7d,
    nextTrainingLabel: nextTraining?.starts_at
      ? `${nextTraining.title || "Training"} · ${formatUpcomingTime(nextTraining.starts_at)}`
      : null,
    nextMatchLabel: nextMatch?.match_date
      ? `vs ${nextMatch.opponent || "TBD"} · ${formatUpcomingTime(`${nextMatch.match_date}T12:00:00`)}`
      : null,
  };
}

/** Upcoming schedule filtered to team scope, plus club-wide events for parents/players. */
export async function fetchTeamScopedDashboardUpcoming(
  clubId: string,
  teamIds: string[] | "all",
  days = 7,
  includeClubEvents = true,
): Promise<DashboardUpcomingItem[]> {
  const now = new Date();
  const toIso = new Date(now.getTime() + days * 86400000).toISOString();
  const nowIso = now.toISOString();
  const today = now.toISOString().slice(0, 10);
  const toDate = toIso.slice(0, 10);

  const [actRes, matchRes, eventRes] = await Promise.all([
    supabase
      .from("activities")
      .select("title, type, starts_at, team_id")
      .eq("club_id", clubId)
      .gte("starts_at", nowIso)
      .lte("starts_at", toIso)
      .order("starts_at", { ascending: true })
      .limit(24),
    supabase
      .from("matches")
      .select("opponent, match_date, team_id, status")
      .eq("club_id", clubId)
      .gte("match_date", today)
      .lte("match_date", toDate)
      .neq("status", "cancelled")
      .order("match_date", { ascending: true })
      .limit(16),
    includeClubEvents
      ? supabase
          .from("events")
          .select("title, event_type, starts_at")
          .eq("club_id", clubId)
          .gte("starts_at", nowIso)
          .lte("starts_at", toIso)
          .order("starts_at", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const items: DashboardUpcomingItem[] = [];

  for (const a of applyTeamFilter(teamIds, (actRes.data ?? []) as Array<{ team_id?: string | null }>)) {
    const row = a as { title: string; type: string; starts_at: string };
    items.push({
      title: row.title || "Activity",
      type: row.type || "training",
      startsAt: row.starts_at,
      time: formatUpcomingTime(row.starts_at),
    });
  }

  for (const m of applyTeamFilter(teamIds, (matchRes.data ?? []) as Array<{ team_id?: string | null }>)) {
    const row = m as { opponent: string; match_date: string };
    const startsAt = `${row.match_date}T12:00:00`;
    items.push({
      title: `vs ${row.opponent || "TBD"}`,
      type: "match",
      startsAt,
      time: formatUpcomingTime(startsAt),
    });
  }

  if (!eventRes.error && includeClubEvents) {
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

  return items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 8);
}

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
