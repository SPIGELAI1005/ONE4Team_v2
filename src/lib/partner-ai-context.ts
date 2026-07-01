import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface PartnerAiContextResult {
  contextText: string;
}

export async function buildPartnerAiContext(
  client: SupabaseClient<Database>,
  userId: string,
  language: "en" | "de",
): Promise<PartnerAiContextResult> {
  const de = language === "de";

  const profileRes = await client
    .from("marketplace_provider_profiles")
    .select("id, provider_name, slug, listing_status, visibility, short_description, provider_type")
    .eq("owner_user_id", userId)
    .maybeSingle();

  const profile = profileRes.data;

  const [requestsRes, offersRes] = await Promise.all([
    client
      .from("marketplace_requests")
      .select("id, title, status, category, club_id, deadline, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(12),
    profile?.id
      ? client
          .from("marketplace_offers")
          .select("id, status, price_indication, request_id, created_at, title")
          .eq("provider_profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as Array<{ id: string; status: string; price_indication: string | null; request_id: string; created_at: string; title: string }>, error: null as null }),
  ]);

  const requests = requestsRes.data ?? [];
  const offers = offersRes.data ?? [];

  const lines: string[] = [];
  lines.push(de ? "## Partner-Marketplace-Kontext" : "## Partner marketplace context");
  lines.push(de ? `UI-Sprache: ${language}` : `UI language: ${language}`);

  lines.push("");
  lines.push(de ? "### Mein Listing" : "### My listing");
  if (profile) {
    lines.push(`- ${profile.provider_name ?? "(unnamed)"} · ${profile.provider_type ?? "supplier"}`);
    lines.push(`- Status: ${profile.listing_status ?? "draft"} · Visibility: ${profile.visibility ?? "private"}`);
    if (profile.slug) lines.push(`- Slug: ${profile.slug}`);
    if (profile.short_description) lines.push(`- Summary: ${profile.short_description}`);
  } else {
    lines.push(de ? "- (noch kein Listing)" : "- (no listing yet)");
  }

  lines.push("");
  lines.push(de ? "### Offene Vereinsanfragen (Marktplatz)" : "### Open club requests (marketplace)");
  if (requests.length) {
    for (const r of requests) {
      lines.push(`- ${r.title} [${r.category}] · ${r.status} · id ${r.id}`);
    }
  } else {
    lines.push(de ? "- (keine offenen Anfragen sichtbar)" : "- (no open requests visible)");
  }

  lines.push("");
  lines.push(de ? "### Meine gesendeten Angebote" : "### My sent offers");
  if (offers.length) {
    for (const o of offers) {
      lines.push(`- ${o.title} · ${o.status}${o.price_indication ? ` · ${o.price_indication}` : ""}`);
    }
  } else {
    lines.push(de ? "- (noch keine Angebote)" : "- (no offers yet)");
  }

  return { contextText: lines.join("\n") };
}
