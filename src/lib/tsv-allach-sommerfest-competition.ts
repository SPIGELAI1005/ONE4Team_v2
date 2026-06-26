import type { SupabaseClient } from "@supabase/supabase-js";
import { SOMMERFEST_MATCHES, type SommerfestMatch } from "@/lib/tsv-allach-sommerfest-2026";
import {
  extractSommerfestMatchIdFromNotes,
  sommerfestMatchImportKey,
  sommerfestMatchToInsertRow,
  SOMMERFEST_MATCH_IMPORT_KEY_PREFIX,
} from "@/lib/tsv-allach-sommerfest-match-sync";
import type { PublicMatchLite } from "@/lib/public-club-models";
import { resolveCanonicalYouthTeamName } from "@/lib/youth-team-label";

export const SOMMERFEST_COMPETITION_NAME = "Sommerfest 2026";
export const SOMMERFEST_TOURNAMENT_SLUG = "sommerfest-2026";
export const SOMMERFEST_EVENT_IMPORT_KEY = "tsv-sommerfest-2026";

const MATCH_SELECT =
  "id, opponent, is_home, match_date, location, status, home_score, away_score, competition_id, team_id, notes, publish_to_public_schedule, public_match_detail_enabled, competitions(name), teams(name)";

export interface SommerfestDbMatchRow {
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
  publish_to_public_schedule?: boolean | null;
  public_match_detail_enabled?: boolean | null;
  competitions?: { name: string } | null;
  teams?: { name: string } | null;
}

/** Ensure the Sommerfest cup competition exists for this club. */
export async function ensureSommerfestCupCompetition(
  supabase: SupabaseClient,
  clubId: string,
): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from("competitions")
    .select("id")
    .eq("club_id", clubId)
    .eq("name", SOMMERFEST_COMPETITION_NAME)
    .eq("competition_type", "cup")
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing?.id) return String(existing.id);

  const { data, error } = await supabase
    .from("competitions")
    .insert({
      club_id: clubId,
      name: SOMMERFEST_COMPETITION_NAME,
      season: "2026",
      competition_type: "cup",
      team_id: null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function upsertSommerfestMatchRecord(
  supabase: SupabaseClient,
  clubId: string,
  template: SommerfestMatch,
  teams: { id: string; name: string }[],
  competitionId: string,
): Promise<SommerfestDbMatchRow> {
  const importKey = sommerfestMatchImportKey(template.id);
  const payload = sommerfestMatchToInsertRow(clubId, template, teams, competitionId, { publishPublic: true });

  const { data: existing, error: findErr } = await supabase
    .from("matches")
    .select("id")
    .eq("club_id", clubId)
    .eq("notes", importKey)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing?.id) {
    const { data, error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", existing.id)
      .eq("club_id", clubId)
      .select(MATCH_SELECT)
      .single();
    if (error) throw error;
    return data as SommerfestDbMatchRow;
  }

  const { data, error } = await supabase.from("matches").insert(payload).select(MATCH_SELECT).single();
  if (error) throw error;
  return data as SommerfestDbMatchRow;
}

/** Publish all Sommerfest PDF fixtures to the matches table under one cup competition. */
export async function publishSommerfestTournament(
  supabase: SupabaseClient,
  clubId: string,
  teams: { id: string; name: string }[],
): Promise<{ competitionId: string; matches: SommerfestDbMatchRow[] }> {
  const competitionId = await ensureSommerfestCupCompetition(supabase, clubId);
  const matches: SommerfestDbMatchRow[] = [];
  for (const template of SOMMERFEST_MATCHES) {
    matches.push(await upsertSommerfestMatchRecord(supabase, clubId, template, teams, competitionId));
  }
  return { competitionId, matches };
}

export async function fetchSommerfestTournamentMatches(
  supabase: SupabaseClient,
  clubId: string,
): Promise<SommerfestDbMatchRow[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("club_id", clubId)
    .like("notes", `${SOMMERFEST_MATCH_IMPORT_KEY_PREFIX}%`)
    .order("match_date", { ascending: true });

  if (error) throw error;
  return (data as SommerfestDbMatchRow[]) ?? [];
}

export interface SommerfestTournamentSlot {
  template: SommerfestMatch;
  match: SommerfestDbMatchRow | null;
}

export function buildSommerfestTournamentSlots(
  dbMatches: SommerfestDbMatchRow[],
): SommerfestTournamentSlot[] {
  const byTemplateId = new Map<string, SommerfestDbMatchRow>();
  for (const row of dbMatches) {
    const templateId = extractSommerfestMatchIdFromNotes(row.notes);
    if (templateId) byTemplateId.set(templateId, row);
  }
  return SOMMERFEST_MATCHES.map((template) => ({
    template,
    match: byTemplateId.get(template.id) ?? null,
  }));
}

export function sommerfestSlotHomeName(
  template: SommerfestMatch,
  teams: { id: string; name: string }[],
  match: SommerfestDbMatchRow | null,
): string {
  if (match?.teams?.name) return match.teams.name;
  return resolveCanonicalYouthTeamName(teams, template.homeTeam);
}

export function sommerfestSlotAwayName(
  template: SommerfestMatch,
  teams: { id: string; name: string }[],
  match: SommerfestDbMatchRow | null,
): string {
  if (match?.opponent) {
    if (template.awayTeam.toLowerCase() === "eltern") return match.opponent;
    return resolveCanonicalYouthTeamName(teams, match.opponent);
  }
  if (template.awayTeam.toLowerCase() === "eltern") {
    return `Eltern (${resolveCanonicalYouthTeamName(teams, template.homeTeam)})`;
  }
  return resolveCanonicalYouthTeamName(teams, template.awayTeam);
}

export function isSommerfestCompetitionMatch(match: Pick<PublicMatchLite, "competitions" | "notes">): boolean {
  if (match.competitions?.name === SOMMERFEST_COMPETITION_NAME) return true;
  return Boolean(extractSommerfestMatchIdFromNotes((match as { notes?: string | null }).notes));
}

export function publicTournamentPath(basePath: string, searchSuffix: string): string {
  return `${basePath}/tournament/${SOMMERFEST_TOURNAMENT_SLUG}${searchSuffix}`;
}
