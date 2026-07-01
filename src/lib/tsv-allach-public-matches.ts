import { CLUB_FOOTBALL_CAMP_TEMPLATES } from "@/lib/club-football-camp-templates";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import type { PublicMatchLite } from "@/lib/public-club-models";
import {
  SOMMERFEST_DATE,
  SOMMERFEST_LOCATION,
  SOMMERFEST_MATCHES,
  type SommerfestMatch,
} from "@/lib/tsv-allach-sommerfest-2026";
import { resolveTeamByYouthLabel, resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";
import {
  extractSommerfestMatchIdFromNotes,
  normalizeSommerfestTemplateId,
} from "@/lib/tsv-allach-sommerfest-match-sync";
import {
  buildPublicMatchOpponentLogoLookup,
  publicMatchOpponentLogoKey,
  resolvePublicMatchOpponentLogo,
} from "@/lib/public-club-match-display";

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

function sommerfestExpectedOpponent(template: SommerfestMatch, teams: PublicClubTeamLite[]): string {
  if (template.awayTeam.toLowerCase() === "eltern") {
    return `Eltern (${resolveCanonicalYouthTeamName(teams, template.homeTeam)})`;
  }
  return resolveCanonicalYouthTeamName(teams, template.awayTeam);
}

function enrichMatchWithOpponentLogo(
  match: PublicMatchLite,
  teams: PublicClubTeamLite[],
  logoLookup: Map<string, string>,
): PublicMatchLite {
  const logo = resolvePublicMatchOpponentLogo(match, teams, logoLookup);
  if (!logo || match.opponent_logo_url === logo) return match;
  return { ...match, opponent_logo_url: logo };
}

function berlinDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date(iso));
}

function buildDbSommerfestMaps(dbRows: PublicMatchLite[], teams: PublicClubTeamLite[]) {
  const dbBySommerfestId = new Map<string, PublicMatchLite>();
  const dbByFixture = new Map<string, PublicMatchLite>();

  for (const row of dbRows) {
    const templateId = extractSommerfestMatchIdFromNotes(row.notes ?? null);
    if (templateId) dbBySommerfestId.set(templateId, row);

    if (row.team_id) {
      const fixtureKey = sommerfestFixtureLinkKey(row.match_date, row.team_id, row.opponent, teams);
      dbByFixture.set(fixtureKey, row);
    }
  }

  return { dbBySommerfestId, dbByFixture };
}

function sommerfestFixtureLinkKey(
  matchDate: string,
  teamId: string,
  opponent: string,
  teams: PublicClubTeamLite[],
): string {
  return `${berlinDayKey(matchDate)}|${teamId}|${publicMatchOpponentLogoKey(opponent, teams)}`;
}

function resolvePersistedSommerfestMatch(
  template: SommerfestMatch,
  teams: PublicClubTeamLite[],
  dbBySommerfestId: Map<string, PublicMatchLite>,
  dbByFixture: Map<string, PublicMatchLite>,
): PublicMatchLite | null {
  const normalizedId = normalizeSommerfestTemplateId(template.id);
  const fromNotes = dbBySommerfestId.get(normalizedId) ?? dbBySommerfestId.get(template.id);
  if (fromNotes) return fromNotes;

  const teamId = resolveShowcaseTeamId(teams, template.homeTeam);
  if (!teamId) return null;
  const opponent = sommerfestExpectedOpponent(template, teams);
  const fixtureKey = sommerfestFixtureLinkKey(sommerfestMatchDate(template.time), teamId, opponent, teams);
  return dbByFixture.get(fixtureKey) ?? null;
}

/** Pilot showcase fixtures for TSV Allach 09 (Sommerfest + camp week markers). */
export function getTsvAllachShowcaseMatches(
  teams: PublicClubTeamLite[],
  dbRows: PublicMatchLite[] = [],
): PublicMatchLite[] {
  const logoLookup = buildPublicMatchOpponentLogoLookup(dbRows, teams);
  const { dbBySommerfestId, dbByFixture } = buildDbSommerfestMaps(dbRows, teams);

  const sommerfest = SOMMERFEST_MATCHES.map((template) => {
    const persisted = resolvePersistedSommerfestMatch(template, teams, dbBySommerfestId, dbByFixture);
    if (persisted) return enrichMatchWithOpponentLogo(persisted, teams, logoLookup);
    const fallback = sommerfestToPublicMatch(template, teams);
    return enrichMatchWithOpponentLogo(fallback, teams, logoLookup);
  });

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

function matchDedupeKey(
  match: Pick<PublicMatchLite, "match_date" | "opponent" | "team_id">,
  teams: PublicClubTeamLite[],
): string {
  const day = berlinDayKey(match.match_date);
  return `${day}|${match.team_id ?? ""}|${publicMatchOpponentLogoKey(match.opponent, teams)}`;
}

function mergeMatchLists(
  dbRows: PublicMatchLite[],
  showcase: PublicMatchLite[],
  teams: PublicClubTeamLite[],
): PublicMatchLite[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const merged: PublicMatchLite[] = [];

  for (const row of [...dbRows, ...showcase]) {
    if (seenIds.has(row.id)) continue;
    const key = matchDedupeKey(row, teams);
    if (seenKeys.has(key)) continue;
    seenIds.add(row.id);
    seenKeys.add(key);
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
  const showcase = getTsvAllachShowcaseMatches(teams, dbRows);
  return mergeMatchLists(dbRows, showcase, teams).sort((a, b) => a.match_date.localeCompare(b.match_date));
}

export function mergePublicClubMatchesRecent(
  club: { name?: string | null; slug?: string | null } | null | undefined,
  dbRows: PublicMatchLite[],
  teams: PublicClubTeamLite[]
): PublicMatchLite[] {
  if (!isTsvAllachClub(club)) return dbRows;
  const showcase = getTsvAllachShowcaseMatches(teams, dbRows);
  return mergeMatchLists(dbRows, showcase, teams).sort((a, b) => b.match_date.localeCompare(a.match_date));
}
