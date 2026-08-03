import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getClubPageDraftConfig,
  parseClubPublicPageConfig,
  type ClubPublicPageConfig,
} from "@/lib/club-public-page-config";
import {
  EMPTY_CLUB_EVENTS_HIGHLIGHT,
  normalizeClubEventsHighlight,
  pickSavedEventsHighlight,
  resolveEffectiveEventsHighlight,
  type ClubEventsHighlightConfig,
} from "@/lib/club-events-highlight";

function extractHighlightFromConfig(config: ClubPublicPageConfig | null | undefined): ClubEventsHighlightConfig | null {
  if (!config) return null;
  return config.eventsHighlight ?? null;
}

export async function loadClubEventsHighlight(
  supabase: SupabaseClient,
  clubId: string,
  club?: { name?: string | null; slug?: string | null } | null,
): Promise<{ data: ClubEventsHighlightConfig; error: Error | null }> {
  const [{ data: row, error }, draftResult] = await Promise.all([
    supabase.from("clubs").select("name, slug, public_page_published_config").eq("id", clubId).maybeSingle(),
    getClubPageDraftConfig(supabase, clubId),
  ]);

  if (error) return { data: resolveEffectiveEventsHighlight(null, club), error: new Error(error.message) };

  const clubMeta = club ?? { name: row?.name, slug: row?.slug };
  const published = parseClubPublicPageConfig(row?.public_page_published_config);
  const fromDraft = draftResult.error ? null : extractHighlightFromConfig(draftResult.data);
  const fromPublished = extractHighlightFromConfig(published);
  const picked = pickSavedEventsHighlight(fromDraft, fromPublished);
  return { data: resolveEffectiveEventsHighlight(picked, clubMeta), error: null };
}

export async function saveClubEventsHighlight(
  supabase: SupabaseClient,
  clubId: string,
  highlight: ClubEventsHighlightConfig,
  _adminUserId: string | null,
): Promise<{ error: Error | null }> {
  const normalized = normalizeClubEventsHighlight(highlight);

  const { data, error } = await supabase.rpc("patch_club_events_highlight", {
    p_club_id: clubId,
    p_highlight: normalized,
  });

  if (error) return { error: new Error(error.message) };
  if (data && typeof data === "object" && (data as { ok?: boolean }).ok !== true) {
    return { error: new Error("events_highlight_save_failed") };
  }
  return { error: null };
}

export { EMPTY_CLUB_EVENTS_HIGHLIGHT };
