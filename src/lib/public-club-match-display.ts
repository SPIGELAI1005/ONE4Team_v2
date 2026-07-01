import type { PublicMatchLite } from "@/lib/public-club-models";
import { resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";

export type PublicMatchStatusBadge = "upcoming" | "live" | "finished" | "cancelled";

type PublicTeamRef = { id: string; name: string };
type MatchSideFields = Pick<PublicMatchLite, "is_home" | "opponent" | "team_id" | "teams">;

/** Club-side team label (e.g. U07-III), not the parent club name. */
export function publicMatchClubTeamName(
  match: Pick<PublicMatchLite, "team_id" | "teams">,
  teams: PublicTeamRef[],
  clubNameFallback: string,
): string {
  const fromJoin = match.teams?.name?.trim();
  if (fromJoin) return fromJoin;
  if (match.team_id) {
    const found = teams.find((team) => team.id === match.team_id);
    if (found?.name) return found.name;
  }
  return clubNameFallback;
}

export function publicMatchOpponentName(match: Pick<PublicMatchLite, "opponent">, teams: PublicTeamRef[]): string {
  return resolveCanonicalYouthTeamName(teams, match.opponent);
}

export function publicMatchFixtureSides(match: MatchSideFields, teams: PublicTeamRef[], clubName: string) {
  const clubSideName = publicMatchClubTeamName(match, teams, clubName);
  const opponentName = publicMatchOpponentName(match, teams);
  return {
    clubSideName,
    opponentName,
    homeName: match.is_home ? clubSideName : opponentName,
    awayName: match.is_home ? opponentName : clubSideName,
  };
}

export function publicMatchHeadline(match: MatchSideFields, teams: PublicTeamRef[], clubName: string): string {
  const { homeName, awayName } = publicMatchFixtureSides(match, teams, clubName);
  return `${homeName} vs ${awayName}`;
}

function normalizeTeamKeyForLogo(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/-/g, "").replace(/\//g, "").replace(/ü/g, "u");
}

/** Stable key for reusing opponent logos across spelling variants (U9-3 ≡ U09-III, Eltern (...)). */
export function publicMatchOpponentLogoKey(opponent: string, teams: PublicTeamRef[]): string {
  const trimmed = opponent.trim();
  const elternMatch = trimmed.match(/^Eltern\s*\((.+)\)$/i);
  if (elternMatch) {
    const inner = resolveCanonicalYouthTeamName(teams, elternMatch[1].trim());
    return `eltern:${normalizeTeamKeyForLogo(inner)}`;
  }
  const canonical = resolveCanonicalYouthTeamName(teams, trimmed);
  return `opponent:${normalizeTeamKeyForLogo(canonical)}`;
}

export function buildPublicMatchOpponentLogoLookup(
  matches: PublicMatchLite[],
  teams: PublicTeamRef[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of matches) {
    const url = match.opponent_logo_url?.trim();
    if (!url) continue;
    map.set(publicMatchOpponentLogoKey(match.opponent, teams), url);
    map.set(`raw:${match.opponent.trim().toLowerCase()}`, url);
  }
  return map;
}

export function resolvePublicMatchOpponentLogo(
  match: Pick<PublicMatchLite, "opponent" | "opponent_logo_url">,
  teams: PublicTeamRef[],
  lookup: Map<string, string>,
): string | null {
  const direct = match.opponent_logo_url?.trim();
  if (direct) return direct;
  return (
    lookup.get(publicMatchOpponentLogoKey(match.opponent, teams)) ??
    lookup.get(`raw:${match.opponent.trim().toLowerCase()}`) ??
    null
  );
}

export function publicMatchSideLogos(
  match: PublicMatchLite,
  teams: PublicTeamRef[],
  clubLogoUrl: string | null | undefined,
  logoLookup: Map<string, string>,
): { homeLogo: string | null; awayLogo: string | null } {
  let opponentLogo = resolvePublicMatchOpponentLogo(match, teams, logoLookup);
  if (opponentLogo && clubLogoUrl && opponentLogo === clubLogoUrl) {
    opponentLogo = null;
  }
  return {
    homeLogo: match.is_home ? clubLogoUrl ?? null : opponentLogo,
    awayLogo: match.is_home ? opponentLogo : clubLogoUrl ?? null,
  };
}

export function mergePublicMatchLists(...lists: PublicMatchLite[][]): PublicMatchLite[] {
  const byId = new Map<string, PublicMatchLite>();
  for (const list of lists) {
    for (const m of list) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()];
}

export function publicMatchStatusBadge(status: string): PublicMatchStatusBadge {
  const s = String(status || "").toLowerCase();
  if (s === "in_progress") return "live";
  if (s === "completed") return "finished";
  if (s === "cancelled") return "cancelled";
  return "upcoming";
}

export function publicMatchInDateRange(match: PublicMatchLite, startMs: number, endMs: number) {
  const t = new Date(match.match_date).getTime();
  return t >= startMs && t <= endMs;
}
