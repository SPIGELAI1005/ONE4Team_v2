import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clubRowToPublicPageConfig,
  getClubPageDraftConfig,
  parseClubPublicPageConfig,
  publicPageConfigToJson,
  saveClubPageDraftConfig,
  type ClubPublicPageConfig,
} from "@/lib/club-public-page-config";
import {
  EMPTY_CLUB_EVENTS_HIGHLIGHT,
  normalizeClubEventsHighlight,
  resolveEffectiveEventsHighlight,
  type ClubEventsHighlightConfig,
} from "@/lib/club-events-highlight";

function extractHighlightFromConfig(config: ClubPublicPageConfig | null | undefined): ClubEventsHighlightConfig | null {
  if (!config) return null;
  return config.eventsHighlight ?? null;
}

/** Load effective highlight for a club (published wins; draft only if nothing published yet). */
export async function loadClubEventsHighlight(
  supabase: SupabaseClient,
  clubId: string,
  club?: { name?: string | null; slug?: string | null } | null,
): Promise<{ data: ClubEventsHighlightConfig; error: Error | null }> {
  const { data: row, error } = await supabase
    .from("clubs")
    .select("name, slug, public_page_published_config")
    .eq("id", clubId)
    .maybeSingle();
  if (error) return { data: { ...EMPTY_CLUB_EVENTS_HIGHLIGHT }, error: new Error(error.message) };

  const clubMeta = club ?? { name: row?.name, slug: row?.slug };
  const published = parseClubPublicPageConfig(row?.public_page_published_config);
  const fromPublished = extractHighlightFromConfig(published);
  if (fromPublished != null) {
    return { data: resolveEffectiveEventsHighlight(fromPublished, clubMeta), error: null };
  }

  const draft = await getClubPageDraftConfig(supabase, clubId);
  if (draft.error) return { data: resolveEffectiveEventsHighlight(null, clubMeta), error: draft.error };
  const fromDraft = extractHighlightFromConfig(draft.data);
  return { data: resolveEffectiveEventsHighlight(fromDraft, clubMeta), error: null };
}

/**
 * Persist highlight into draft + published snapshot so members see it immediately.
 * Does not run a full page publish (other draft fields stay unpublished).
 */
export async function saveClubEventsHighlight(
  supabase: SupabaseClient,
  clubId: string,
  highlight: ClubEventsHighlightConfig,
  adminUserId: string | null,
): Promise<{ error: Error | null }> {
  const normalized = normalizeClubEventsHighlight(highlight);

  const { data: row, error: loadError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();
  if (loadError) return { error: new Error(loadError.message) };
  if (!row) return { error: new Error("club_not_found") };

  const base = clubRowToPublicPageConfig(row as Record<string, unknown>);
  const draftResult = await getClubPageDraftConfig(supabase, clubId);
  const draftBase = draftResult.data ?? base;
  const nextDraft: ClubPublicPageConfig = { ...draftBase, eventsHighlight: normalized };
  const draftSave = await saveClubPageDraftConfig(supabase, clubId, nextDraft, adminUserId);
  if (draftSave.error) return draftSave;

  const publishedBase = parseClubPublicPageConfig(row.public_page_published_config) ?? base;
  const nextPublished: ClubPublicPageConfig = { ...publishedBase, eventsHighlight: normalized };
  const { error: pubError } = await supabase
    .from("clubs")
    .update({ public_page_published_config: publicPageConfigToJson(nextPublished) })
    .eq("id", clubId);
  if (pubError) return { error: new Error(pubError.message) };
  return { error: null };
}
