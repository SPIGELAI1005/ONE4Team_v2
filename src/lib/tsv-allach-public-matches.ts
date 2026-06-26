import { CLUB_FOOTBALL_CAMP_TEMPLATES } from "@/lib/club-football-camp-templates";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import type { PublicMatchLite } from "@/lib/public-club-models";
import {
  SOMMERFEST_DATE,
  SOMMERFEST_LOCATION,
  SOMMERFEST_MATCHES,
  type SommerfestMatch,
} from "@/lib/tsv-allach-sommerfest-2026";
import { resolveTeamByYouthLabel } from "@/lib/youth-team-label";

const SHOWCASE_MATCH_PREFIX = "tsv-showcase-match-";

export interface PublicClubTeamLite {
  id: string;
  name: string;
}

function showcaseMatchId(key: string): string {
  return `${SHOWCASE_MATCH_PREFIX}${key}`;
}

export function isTsvAllachShowcaseMatchId(id: string): boolean {
  return id.startsWith(SHOWCASE_MATCH_PREFIX);
}

function normalizeTeamKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/ü/g, "u");
}

/** Map Sommerfest / internal labels (e.g. U12-1) to a club team row. */
export function resolveShowcaseTeamId(teams: PublicClubTeamLite[], label: string): string | null {
  const youthTeam = resolveTeamByYouthLabel(teams, label);
  if (youthTeam) return youthTeam.id;

  const key = normalizeTeamKey(label);
  if (!key) return null;

  for (const team of teams) {
    if (normalizeTeamKey(team.name) === key) return team.id;
  }

  if (label.toLowerCase().includes("allach")) {
    if (/1$/.test(key) || key.includes("erste") || key.includes("1herren")) {
      const herren = teams.find((t) => /erste|1\.?\s*herren|allach\s*1/i.test(t.name));
      if (herren) return herren.id;
    }
    if (/2$/.test(key) || key.includes("zweite") || key.includes("2herren")) {
      const herren = teams.find((t) => /zweite|2\.?\s*herren|allach\s*2/i.test(t.name));
      if (herren) return herren.id;
    }
    if (key.includes("damen")) {
      const damen = teams.find((t) => /damen|frauen/i.test(t.name));
      if (damen) return damen.id;
    }
  }

  return null;
}

function sommerfestMatchDate(time: string): string {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const date = new Date(`${SOMMERFEST_DATE}T00:00:00+02:00`);
  date.setHours(hours, minutes ?? 0, 0, 0);
  return date.toISOString();
}

function sommerfestToPublicMatch(match: SommerfestMatch, teams: PublicClubTeamLite[]): PublicMatchLite {
  const teamId = resolveShowcaseTeamId(teams, match.homeTeam);
  const teamName = teamId ? (teams.find((t) => t.id === teamId)?.name ?? match.homeTeam) : match.homeTeam;
  const displayOpponent =
    match.awayTeam.toLowerCase() === "eltern" ? `Eltern (${match.homeTeam})` : match.awayTeam;

  return {
    id: showcaseMatchId(match.id),
    opponent: displayOpponent,
    is_home: true,
    match_date: sommerfestMatchDate(match.time),
    location: `${match.pitchLabel} · ${SOMMERFEST_LOCATION}`,
    status: "scheduled",
    home_score: null,
    away_score: null,
    team_id: teamId,
    teams: { name: teamName },
    publish_to_public_schedule: true,
    competitions: { name: "Sommerfest 2026" },
    public_match_detail_enabled: true,
    opponent_logo_url: null,
  };
}

/** Pilot showcase fixtures for TSV Allach 09 (Sommerfest + camp week markers). */
export function getTsvAllachShowcaseMatches(teams: PublicClubTeamLite[]): PublicMatchLite[] {
  const sommerfest = SOMMERFEST_MATCHES.map((m) => sommerfestToPublicMatch(m, teams));

  const campMarkers: PublicMatchLite[] = CLUB_FOOTBALL_CAMP_TEMPLATES.map((camp) => ({
    id: showcaseMatchId(`camp-${camp.importKey}`),
    opponent: camp.partnerName,
    is_home: true,
    match_date: camp.startsAt,
    location: camp.location,
    status: "scheduled",
    home_score: null,
    away_score: null,
    team_id: null,
    teams: null,
    publish_to_public_schedule: true,
    competitions: { name: "Football camp" },
    public_match_detail_enabled: true,
    opponent_logo_url: null,
  }));

  return [...sommerfest, ...campMarkers].sort((a, b) => a.match_date.localeCompare(b.match_date));
}

function matchDedupeKey(match: Pick<PublicMatchLite, "match_date" | "opponent" | "team_id">): string {
  const day = match.match_date.slice(0, 10);
  return `${day}|${match.opponent.trim().toLowerCase()}|${match.team_id ?? ""}`;
}

function mergeMatchLists(dbRows: PublicMatchLite[], showcase: PublicMatchLite[]): PublicMatchLite[] {
  const dbKeys = new Set(dbRows.map(matchDedupeKey));
  const extra = showcase.filter((m) => !dbKeys.has(matchDedupeKey(m)));
  const seen = new Set<string>();
  const merged: PublicMatchLite[] = [];

  for (const row of [...dbRows, ...extra]) {
    const key = matchDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged;
}

export function mergePublicClubMatchesUpcoming(
  club: { name?: string | null; slug?: string | null } | null | undefined,
  dbRows: PublicMatchLite[],
  teams: PublicClubTeamLite[]
): PublicMatchLite[] {
  if (!isTsvAllachClub(club)) return dbRows;
  const showcase = getTsvAllachShowcaseMatches(teams);
  return mergeMatchLists(dbRows, showcase).sort((a, b) => a.match_date.localeCompare(b.match_date));
}

export function mergePublicClubMatchesRecent(
  club: { name?: string | null; slug?: string | null } | null | undefined,
  dbRows: PublicMatchLite[],
  teams: PublicClubTeamLite[]
): PublicMatchLite[] {
  if (!isTsvAllachClub(club)) return dbRows;
  const showcase = getTsvAllachShowcaseMatches(teams);
  return mergeMatchLists(dbRows, showcase).sort((a, b) => b.match_date.localeCompare(a.match_date));
}
