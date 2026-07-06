import {
  SOMMERFEST_DATE,
  SOMMERFEST_LOCATION,
  type SommerfestMatch,
} from "@/lib/tsv-allach-sommerfest-2026";
import { resolveShowcaseTeamId } from "@/lib/tsv-allach-public-matches";
import { resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";

export const SOMMERFEST_MATCH_IMPORT_KEY_PREFIX = "tsv-sommerfest-2026:";
export const SOMMERFEST_TIMEZONE = "Europe/Berlin";
/** Sommerfest day uses fixed CEST (+02:00) for stable kickoff conversion. */
const SOMMERFEST_UTC_OFFSET = "+02:00";

export function sommerfestMatchImportKey(templateId: string): string {
  return `${SOMMERFEST_MATCH_IMPORT_KEY_PREFIX}${templateId}`;
}

export function normalizeSommerfestTemplateId(id: string): string {
  const match = id.trim().match(/^m(\d+)$/i);
  if (!match) return id.trim().toLowerCase();
  return `m${String(Number(match[1])).padStart(2, "0")}`;
}

export function extractSommerfestMatchIdFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/tsv-sommerfest-2026:(m\d+)/i);
  if (!match?.[1]) return null;
  return normalizeSommerfestTemplateId(match[1]);
}

export function sommerfestMatchDateIso(time: string): string {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const date = new Date(`${SOMMERFEST_DATE}T00:00:00${SOMMERFEST_UTC_OFFSET}`);
  date.setHours(hours, minutes ?? 0, 0, 0);
  return date.toISOString();
}

function berlinTimeParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SOMMERFEST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return { hour, minute };
}

/** HH:mm kickoff label in Europe/Berlin. */
export function sommerfestBerlinTimeLabel(iso: string): string {
  const { hour, minute } = berlinTimeParts(iso);
  return `${hour}:${minute}`;
}

/** Effective schedule time: persisted DB kickoff when available, else template default. */
export function sommerfestEffectiveKickoffTime(
  template: SommerfestMatch,
  dbMatch?: { match_date: string } | null,
): string {
  if (dbMatch?.match_date) return sommerfestBerlinTimeLabel(dbMatch.match_date);
  return template.time;
}

/** Convert `<input type="datetime-local">` value to ISO using Sommerfest Berlin offset. */
export function sommerfestDatetimeLocalToIso(localValue: string): string {
  const match = localValue.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return localValue;
  const [, datePart, hours, minutes] = match;
  const date = new Date(`${datePart}T00:00:00${SOMMERFEST_UTC_OFFSET}`);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toISOString();
}

/** Convert stored ISO to `<input type="datetime-local">` in Europe/Berlin. */
export function sommerfestIsoToDatetimeLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SOMMERFEST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
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
    opponent_logo_url?: string | null;
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
    opponent_logo_url: dbMatch?.opponent_logo_url ?? null,
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
