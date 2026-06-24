import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isMissingRelationError } from "@/lib/public-club-models";

export interface ClubQuickPrompt {
  label: string;
  prompt: string;
}

export interface BuildClubContextOptions {
  clubId: string;
  clubName: string;
  language: "en" | "de";
  /** When true, unpaid dues count is fetched; RLS may still hide rows for non-admins. */
  isAdmin: boolean;
}

interface MembershipRow {
  id: string;
  role: string;
  status: string;
  team: string | null;
  position: string | null;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string | null } | null;
}

export interface ActivitySummaryRow {
  id?: string;
  type: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  teams?: { name: string | null } | null;
}

interface EventRow {
  title: string;
  event_type: string;
  starts_at: string;
}

interface MatchRow {
  opponent: string;
  match_date: string;
  status: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  team_id?: string | null;
  teams?: { name: string | null } | null;
}

interface TeamRow {
  id: string;
  name: string;
}

/** Group upcoming matches by team name for LLM context. */
export function formatMatchesByTeam(
  matches: MatchRow[],
  language: "en" | "de",
): string[] {
  const byTeam = new Map<string, string[]>();
  for (const m of matches) {
    const team = m.teams?.name?.trim() || (language === "de" ? "Ohne Mannschaft" : "No team");
    const loc = m.is_home ? (language === "de" ? "Heim" : "home") : language === "de" ? "Auswärts" : "away";
    const line = `- ${m.match_date.slice(0, 10)} vs ${m.opponent} (${loc}, ${m.status})`;
    const bucket = byTeam.get(team) ?? [];
    bucket.push(line);
    byTeam.set(team, bucket);
  }
  const lines: string[] = [];
  for (const [team, items] of byTeam) {
    lines.push(`### ${team}`);
    lines.push(...items);
  }
  return lines;
}

/** Distinct training venues/locations in schedule data. */
export function formatVenueLines(locations: string[], language: "en" | "de"): string[] {
  const unique = [...new Set(locations.map((l) => l.trim()).filter(Boolean))].sort();
  if (!unique.length) {
    return [language === "de" ? "- (keine Orte in den Trainingsdaten)" : "- (no venues in training data)"];
  }
  return unique.map((v) => `- ${v}`);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_CLUB_TIMEZONE = "Europe/Berlin";

/** Format an ISO instant for LLM context in the club timezone (matches Teams UI local display). */
export function formatContextDateTime(iso: string, timeZone: string, language: "en" | "de"): string {
  const d = new Date(iso);
  const locale = language === "de" ? "de-DE" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatContextTimeOnly(iso: string, timeZone: string, language: "en" | "de"): string {
  const d = new Date(iso);
  const locale = language === "de" ? "de-DE" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatTodayInClubTimeZone(timeZone: string, language: "en" | "de"): string {
  const locale = language === "de" ? "de-DE" : "en-GB";
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "full" }).format(new Date());
}

export function formatActivityScheduleLine(a: ActivitySummaryRow, timeZone: string, language: "en" | "de"): string {
  const start = formatContextDateTime(a.starts_at, timeZone, language);
  const end = a.ends_at ? `–${formatContextTimeOnly(a.ends_at, timeZone, language)}` : "";
  const team = a.teams?.name?.trim();
  const teamBit = team ? ` (team: ${team})` : "";
  return `- ${start}${end} [${a.type}] ${a.title}${teamBit}`;
}

async function fetchTrainingActivities(
  client: SupabaseClient<Database>,
  clubId: string,
  fromIso: string,
  toIso: string,
): Promise<ActivitySummaryRow[]> {
  const activitiesRes = await client
    .from("activities")
    .select("id, type, title, starts_at, ends_at, location, teams(name)")
    .eq("club_id", clubId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(100);

  if (!activitiesRes.error) {
    return (activitiesRes.data ?? []) as unknown as ActivitySummaryRow[];
  }
  if (!isMissingRelationError(activitiesRes.error)) {
    return [];
  }

  const sessionsRes = await client
    .from("training_sessions")
    .select("id, title, starts_at, ends_at, teams(name)")
    .eq("club_id", clubId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(100);

  if (sessionsRes.error) return [];

  return ((sessionsRes.data ?? []) as Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    teams: { name: string | null } | null;
  }>).map((row) => ({
    id: row.id,
    type: "training",
    title: row.title,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    teams: row.teams,
  }));
}

function formatMatchScore(m: MatchRow): string {
  if (m.home_score == null || m.away_score == null) return "";
  const ours = m.is_home ? m.home_score : m.away_score;
  const theirs = m.is_home ? m.away_score : m.home_score;
  return `${ours}-${theirs}`;
}

function buildSuggestedPrompts(params: {
  language: "en" | "de";
  isAdmin: boolean;
  upcomingWithin48h: MatchRow | null;
  trainingsThisWeek: number;
  unpaidDues: number | null;
  lastCompleted: MatchRow | null;
  clubName: string;
}): ClubQuickPrompt[] {
  const { language, isAdmin, upcomingWithin48h, trainingsThisWeek, unpaidDues, lastCompleted, clubName } = params;
  const de = language === "de";
  const out: ClubQuickPrompt[] = [];

  if (upcomingWithin48h) {
    const when = new Date(upcomingWithin48h.match_date).toLocaleString(language === "de" ? "de-DE" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    out.push({
      label: de ? "Aufstellung vorbereiten" : "Prepare lineup",
      prompt: de
        ? `Bereite eine mogliche Startaufstellung und Taktik-Hinweise fur unser nachstes Spiel gegen ${upcomingWithin48h.opponent} am ${when} vor. Nutze den bereitgestellten Vereinskontext.`
        : `Prepare a possible starting lineup and tactical notes for our next match against ${upcomingWithin48h.opponent} on ${when}. Use the club context provided.`,
    });
  }

  if (trainingsThisWeek > 0) {
    out.push({
      label: de ? "Trainingswoche prufen" : "Review training week",
      prompt: de
        ? `Uberprufe die geplanten Trainingseinheiten dieser Woche fur ${clubName} und schlage Schwerpunkte und Progression vor.`
        : `Review this week's scheduled training sessions for ${clubName} and suggest focus areas and progression.`,
    });
  }

  if (isAdmin && unpaidDues !== null && unpaidDues > 0) {
    out.push({
      label: de ? "Beitrags-Follow-up" : "Dues follow-up",
      prompt: de
        ? `Entwirf einen professionellen, fairen Follow-up-Plan fur ${unpaidDues} Mitglieder mit ausstehenden Beitragen.`
        : `Draft a professional, fair follow-up plan for ${unpaidDues} members with outstanding dues.`,
    });
  }

  if (lastCompleted) {
    const score = formatMatchScore(lastCompleted);
    const scoreBit = score ? (de ? ` Ergebnis ${score}.` : ` Score ${score}.`) : "";
    out.push({
      label: de ? "Letztes Spiel analysieren" : "Analyze last result",
      prompt: de
        ? `Analysiere unser letztes Spiel gegen ${lastCompleted.opponent}.${scoreBit} Was lief gut, was verbessern wir als Nachstes?`
        : `Analyze our latest match against ${lastCompleted.opponent}.${scoreBit} What went well and what should we improve next?`,
    });
  }

  return out;
}

/** Merge data-driven prompts first, then fallbacks, up to `max` items. */
export function mergeQuickPrompts(smart: ClubQuickPrompt[], fallback: ClubQuickPrompt[], max = 8): ClubQuickPrompt[] {
  const seen = new Set<string>();
  const merged: ClubQuickPrompt[] = [];
  for (const p of [...smart, ...fallback]) {
    const key = p.prompt.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
    if (merged.length >= max) break;
  }
  return merged;
}

/**
 * Loads club-scoped data the current user can see (RLS) and returns an LLM-ready text block plus smart quick prompts.
 */
export async function buildClubContext(
  client: SupabaseClient<Database>,
  opts: BuildClubContextOptions,
): Promise<{
  contextText: string;
  suggestedPrompts: ClubQuickPrompt[];
  activities: Array<{ id: string; type: string; title: string; starts_at: string }>;
  unpaidDues: number | null;
}> {
  const { clubId, clubName, language, isAdmin } = opts;
  const from = startOfDay(new Date());
  const to = addDays(from, 7);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const now = new Date();
  const in48h = addDays(now, 2);
  const thirtyDaysAgo = addDays(now, -30);

  const membershipsQ = client
    .from("club_memberships")
    .select("id, role, status, team, position, created_at, updated_at, profiles!club_memberships_profile_fk(display_name)")
    .eq("club_id", clubId)
    .limit(500);

  const clubTzQ = client.from("clubs").select("timezone, default_language").eq("id", clubId).maybeSingle();

  const teamsQ = client.from("teams").select("id, name").eq("club_id", clubId).order("name").limit(80);

  const eventsQ = client
    .from("events")
    .select("title, event_type, starts_at")
    .eq("club_id", clubId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(100);

  const upcomingMatchesQ = client
    .from("matches")
    .select("opponent, match_date, status, is_home, home_score, away_score, team_id, teams(name)")
    .eq("club_id", clubId)
    .gte("match_date", fromIso)
    .order("match_date", { ascending: true })
    .limit(20);

  const recentMatchesQ = client
    .from("matches")
    .select("opponent, match_date, status, is_home, home_score, away_score")
    .eq("club_id", clubId)
    .eq("status", "completed")
    .order("match_date", { ascending: false })
    .limit(5);

  const duesQ = isAdmin
    ? client.from("membership_dues").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "due")
    : Promise.resolve({ count: null as number | null, error: null as null });

  const [memRes, clubTzRes, teamsRes, evRes, upMatchRes, recMatchRes, duesRes, activities] = await Promise.all([
    membershipsQ,
    clubTzQ,
    teamsQ,
    eventsQ,
    upcomingMatchesQ,
    recentMatchesQ,
    duesQ,
    fetchTrainingActivities(client, clubId, fromIso, toIso),
  ]);

  const clubTimeZone = clubTzRes.data?.timezone?.trim() || DEFAULT_CLUB_TIMEZONE;
  const clubDefaultLanguage = (clubTzRes.data?.default_language === "de" ? "de" : "en") as "en" | "de";
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const memberships = (memRes.data ?? []) as unknown as MembershipRow[];
  const events = (evRes.data ?? []) as unknown as EventRow[];
  const upcomingMatchesRaw = (upMatchRes.data ?? []) as unknown as MatchRow[];
  const recentCompleted = (recMatchRes.data ?? []) as unknown as MatchRow[];

  const upcomingMatches = upcomingMatchesRaw.filter((m) => m.status !== "completed");
  let unpaidDues: number | null = null;
  if (isAdmin && duesRes && "count" in duesRes) {
    unpaidDues = typeof duesRes.count === "number" ? duesRes.count : null;
    if (duesRes.error) unpaidDues = null;
  }

  const activeMembers = memberships.filter((m) => m.status === "active");
  const roleCounts: Record<string, number> = {};
  for (const m of activeMembers) {
    roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1;
  }

  const recentJoins = activeMembers.filter((m) => new Date(m.created_at) >= thirtyDaysAgo).length;
  const inactiveCount = memberships.filter((m) => m.status !== "active").length;

  const rosterLines = activeMembers.slice(0, 45).map((m) => {
    const name = m.profiles?.display_name || "Member";
    const pos = m.position ? `, ${m.position}` : "";
    const tm = m.team ? `, team ${m.team}` : "";
    return `- ${name} (${m.role}${pos}${tm})`;
  });

  const activityLines = activities.map((a) => formatActivityScheduleLine(a, clubTimeZone, language));
  const eventLines = events.map(
    (e) => `- ${formatContextDateTime(e.starts_at, clubTimeZone, language)} [${e.event_type}] ${e.title}`,
  );

  const upcomingMatchLines = upcomingMatches.slice(0, 10).map((m) => {
    const loc = m.is_home ? "home" : "away";
    return `- ${m.match_date.slice(0, 10)} vs ${m.opponent} (${loc}, ${m.status})`;
  });

  const recentResultLines = recentCompleted.slice(0, 5).map((m) => {
    const sc = formatMatchScore(m);
    const loc = m.is_home ? "home" : "away";
    const scoreStr = sc ? ` score ${sc}` : "";
    return `- ${m.match_date.slice(0, 10)} vs ${m.opponent} (${loc})${scoreStr}`;
  });

  const trainingsThisWeek = activities.filter((a) => a.type === "training").length;

  let upcomingWithin48h: MatchRow | null = null;
  for (const m of upcomingMatches) {
    const dt = new Date(m.match_date);
    if (dt >= now && dt <= in48h) {
      upcomingWithin48h = m;
      break;
    }
  }

  const upcomingMatchByTeamLines = formatMatchesByTeam(upcomingMatches, language);
  const venueLines = formatVenueLines(
    activities.map((a) => a.location ?? ""),
    language,
  );

  const suggestedPrompts = buildSuggestedPrompts({
    language,
    isAdmin,
    upcomingWithin48h,
    trainingsThisWeek,
    unpaidDues,
    lastCompleted: recentCompleted[0] ?? null,
    clubName,
  });

  const lines: string[] = [];
  lines.push(`Club: ${clubName}`);
  lines.push(`Club ID: ${clubId}`);
  lines.push(`UI language: ${language}`);
  lines.push(`Club default language: ${clubDefaultLanguage}`);
  if (clubDefaultLanguage === "de" && language === "de") {
    lines.push("Preferred reply language: de (German club — reply in German unless user writes English).");
  }
  lines.push(`Club timezone: ${clubTimeZone}`);
  lines.push(`Today (club local): ${formatTodayInClubTimeZone(clubTimeZone, language)}`);
  lines.push("Schedule times below are in the club timezone (same as the Teams & Trainings calendar).");
  lines.push("Team labels may use Roman numerals (e.g. U12-I); treat U12-1 and U12-I as the same team when matching.");
  lines.push("");
  lines.push("## Teams");
  if (teams.length) {
    for (const t of teams) {
      lines.push(`- ${t.name} (id: ${t.id})`);
    }
  } else {
    lines.push(language === "de" ? "- (keine Mannschaften geladen)" : "- (no teams loaded)");
  }
  lines.push("");
  lines.push("## Members");
  lines.push(`- Active members: ${activeMembers.length} (total rows: ${memberships.length})`);
  lines.push(`- Role distribution (active): ${JSON.stringify(roleCounts)}`);
  lines.push(`- New active members (approx. last 30 days): ${recentJoins}`);
  lines.push(`- Non-active memberships: ${inactiveCount}`);
  lines.push("- Roster snapshot (active, capped):");
  lines.push(...(rosterLines.length ? rosterLines : ["- (none listed)"]));
  lines.push("");
  lines.push("## Schedule (next 7 days)");
  lines.push("### Activities (trainings / calendar)");
  lines.push(...(activityLines.length ? activityLines : ["- (none in range)"]));
  lines.push("### Club events");
  lines.push(...(eventLines.length ? eventLines : ["- (none in range)"]));
  lines.push("### Upcoming matches");
  lines.push(...(upcomingMatchLines.length ? upcomingMatchLines : ["- (none in range)"]));
  lines.push("### Upcoming matches by team");
  lines.push(...(upcomingMatchByTeamLines.length ? upcomingMatchByTeamLines : ["- (none in range)"]));
  lines.push("### Training venues (next 7 days)");
  lines.push(...venueLines);
  lines.push("");
  lines.push("## Recent match results (last 5 completed)");
  lines.push(...(recentResultLines.length ? recentResultLines : ["- (none)"]));
  lines.push("");
  lines.push("## Finance (admin-only summary)");
  if (isAdmin) {
    lines.push(
      unpaidDues !== null
        ? `- Unpaid dues records (status=due): ${unpaidDues}`
        : "- Unpaid dues: not available (insufficient access or query failed)",
    );
  } else {
    lines.push("- Dues detail omitted for non-admin role.");
  }

  return {
    contextText: lines.join("\n"),
    suggestedPrompts,
    activities: activities.map((a) => ({
      id: (a as ActivitySummaryRow).id ?? "",
      type: a.type,
      title: a.title,
      starts_at: a.starts_at,
    })),
    unpaidDues,
  };
}

export function formatClubContextForPrompt(
  contextText: string,
  extraFromUrl?: string | null,
): string {
  if (!extraFromUrl?.trim()) return contextText;
  return `${contextText}\n\n## Additional context (from app link)\n${extraFromUrl.trim()}`;
}
