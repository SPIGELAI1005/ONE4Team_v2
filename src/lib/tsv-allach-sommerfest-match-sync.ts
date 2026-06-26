import {
  SOMMERFEST_DATE,
  SOMMERFEST_LOCATION,
  type SommerfestMatch,
} from "@/lib/tsv-allach-sommerfest-2026";
import { resolveShowcaseTeamId } from "@/lib/tsv-allach-public-matches";
import { resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";

export const SOMMERFEST_MATCH_IMPORT_KEY_PREFIX = "tsv-sommerfest-2026:";

export function sommerfestMatchImportKey(templateId: string): string {
  return `${SOMMERFEST_MATCH_IMPORT_KEY_PREFIX}${templateId}`;
}

export function extractSommerfestMatchIdFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/tsv-sommerfest-2026:(m\d+)/i);
  return match?.[1] ?? null;
}

export function sommerfestMatchDateIso(time: string): string {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const date = new Date(`${SOMMERFEST_DATE}T00:00:00+02:00`);
  date.setHours(hours, minutes ?? 0, 0, 0);
  return date.toISOString();
}

export function sommerfestMatchOpponent(
  template: SommerfestMatch,
  teams: { id: string; name: string }[],
): string {
  if (template.awayTeam.toLowerCase() === "eltern") {
    return `Eltern (${resolveCanonicalYouthTeamName(teams, template.homeTeam)})`;
  }
  return resolveCanonicalYouthTeamName(teams, template.awayTeam);
}

export interface SommerfestMatchInsertRow {
  club_id: string;
  opponent: string;
  is_home: boolean;
  match_date: string;
  location: string;
  status: string;
  team_id: string | null;
  competition_id: string | null;
  notes: string;
  publish_to_public_schedule?: boolean;
  public_match_detail_enabled?: boolean;
}

export function sommerfestMatchToInsertRow(
  clubId: string,
  template: SommerfestMatch,
  teams: { id: string; name: string }[],
  competitionId?: string | null,
  options?: { publishPublic?: boolean },
): SommerfestMatchInsertRow {
  const publishPublic = options?.publishPublic !== false;
  return {
    club_id: clubId,
    opponent: sommerfestMatchOpponent(template, teams),
    is_home: true,
    match_date: sommerfestMatchDateIso(template.time),
    location: `${template.pitchLabel} · ${SOMMERFEST_LOCATION}`,
    status: "scheduled",
    team_id: resolveShowcaseTeamId(teams, template.homeTeam),
    competition_id: competitionId ?? null,
    notes: sommerfestMatchImportKey(template.id),
    publish_to_public_schedule: publishPublic,
    public_match_detail_enabled: publishPublic,
  };
}

export function sommerfestTemplateToDashboardMatch(
  template: SommerfestMatch,
  teams: { id: string; name: string }[],
  dbMatch?: {
    id: string;
    opponent: string;
    is_home: boolean;
    match_date: string;
    location: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
    competition_id: string | null;
    team_id: string | null;
    notes: string | null;
    teams?: { name: string } | null;
    competitions?: { name: string } | null;
  },
) {
  const teamId = dbMatch?.team_id ?? resolveShowcaseTeamId(teams, template.homeTeam);
  const teamName =
    dbMatch?.teams?.name ??
    (teamId ? teams.find((team) => team.id === teamId)?.name : null) ??
    resolveCanonicalYouthTeamName(teams, template.homeTeam);

  return {
    id: dbMatch?.id ?? `sommerfest-template-${template.id}`,
    opponent: dbMatch?.opponent ?? sommerfestMatchOpponent(template, teams),
    is_home: dbMatch?.is_home ?? true,
    match_date: dbMatch?.match_date ?? sommerfestMatchDateIso(template.time),
    location: dbMatch?.location ?? `${template.pitchLabel} · ${SOMMERFEST_LOCATION}`,
    status: dbMatch?.status ?? "scheduled",
    home_score: dbMatch?.home_score ?? null,
    away_score: dbMatch?.away_score ?? null,
    competition_id: dbMatch?.competition_id ?? null,
    team_id: teamId,
    notes: dbMatch?.notes ?? sommerfestMatchImportKey(template.id),
    teams: teamName ? { name: teamName } : null,
    competitions: dbMatch?.competitions ?? { name: "Sommerfest 2026" },
    sommerfestTemplateId: template.id,
    isSommerfestTemplateOnly: !dbMatch,
  };
}

export type SommerfestDashboardMatch = ReturnType<typeof sommerfestTemplateToDashboardMatch>;

export function isSommerfestTemplateOnlyMatch(
  match: { id: string; isSommerfestTemplateOnly?: boolean } | null | undefined,
): boolean {
  if (!match) return false;
  return Boolean(match.isSommerfestTemplateOnly) || match.id.startsWith("sommerfest-template-");
}
