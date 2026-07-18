export interface MatchStandingsInput {
  team_id: string | null;
  teams?: { name: string } | null;
  status: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  competition_id?: string | null;
}

export interface MatchStandingRow {
  key: string;
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface ComputeMatchStandingsOptions {
  /** When set, only matches with this competition_id are included. */
  competitionId?: string | null;
  /** Label for rows with no team_id. */
  clubLabel?: string;
}

/**
 * Our-side W-D-L standings from completed matches (club team perspective).
 * Groups by match.team_id; null team_id rolls into a single club row.
 */
export function computeMatchStandings(
  matches: MatchStandingsInput[],
  options: ComputeMatchStandingsOptions = {},
): MatchStandingRow[] {
  const clubLabel = options.clubLabel?.trim() || "Club";
  const competitionId = options.competitionId?.trim() || null;

  const completed = matches.filter((m) => {
    if (m.status !== "completed") return false;
    if (competitionId && m.competition_id !== competitionId) return false;
    return true;
  });

  const stats: Record<string, Omit<MatchStandingRow, "gd" | "key"> & { key: string }> = {};

  for (const m of completed) {
    const teamKey = m.team_id || "club";
    const teamName = m.teams?.name?.trim() || clubLabel;
    if (!stats[teamKey]) {
      stats[teamKey] = { key: teamKey, team: teamName, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    }
    const s = stats[teamKey];
    s.p += 1;
    const gf = m.is_home ? (m.home_score || 0) : (m.away_score || 0);
    const ga = m.is_home ? (m.away_score || 0) : (m.home_score || 0);
    s.gf += gf;
    s.ga += ga;
    if (gf > ga) {
      s.w += 1;
      s.pts += 3;
    } else if (gf === ga) {
      s.d += 1;
      s.pts += 1;
    } else {
      s.l += 1;
    }
  }

  return Object.values(stats)
    .map((row) => ({ ...row, gd: row.gf - row.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

export const COMPETITION_TYPE_FILTERS = ["all", "league", "cup", "tournament", "friendly"] as const;
export type CompetitionTypeFilter = (typeof COMPETITION_TYPE_FILTERS)[number];

export function filterCompetitionsByType<T extends { competition_type: string }>(
  competitions: T[],
  filter: CompetitionTypeFilter,
): T[] {
  if (filter === "all") return competitions;
  return competitions.filter((c) => c.competition_type === filter);
}
