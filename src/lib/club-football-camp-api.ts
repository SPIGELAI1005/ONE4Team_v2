import { supabase } from "@/integrations/supabase/client";
import {
  CLUB_FOOTBALL_CAMP_TEMPLATES,
  type ClubFootballCampTemplate,
} from "@/lib/club-football-camp-templates";

/** Extended club event row (camp fields may be absent until migration applied). */
export interface ClubCampEventRow {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  image_url?: string | null;
  public_summary?: string | null;
  registration_external_url?: string | null;
  public_registration_enabled?: boolean | null;
  public_event_detail_enabled?: boolean | null;
  publish_to_public_schedule?: boolean | null;
  target_audience?: string | null;
  partner_name?: string | null;
  contact_email?: string | null;
  import_key?: string | null;
  team_id?: string | null;
}

function templatePayload(
  template: ClubFootballCampTemplate,
  clubId: string,
  createdBy: string,
  language: "de" | "en",
) {
  const isDe = language === "de";
  return {
    club_id: clubId,
    title: isDe ? template.titleDe : template.titleEn,
    description: isDe ? template.descriptionDe : template.descriptionEn,
    event_type: "camp",
    location: template.location,
    starts_at: template.startsAt,
    ends_at: template.endsAt,
    max_participants: null,
    created_by: createdBy,
    image_url: template.imagePath,
    public_summary: isDe ? template.publicSummaryDe : template.publicSummaryEn,
    registration_external_url: template.registrationUrl,
    public_registration_enabled: true,
    public_event_detail_enabled: true,
    publish_to_public_schedule: true,
    target_audience: isDe ? template.targetAudienceDe : template.targetAudienceEn,
    partner_name: template.partnerName,
    contact_email: template.contactEmail,
    import_key: template.importKey,
    team_id: null,
  };
}

export async function fetchClubCampEvents(clubId: string): Promise<ClubCampEventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .eq("event_type", "camp")
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ClubCampEventRow[];
}

export async function upsertClubCampFromTemplate(params: {
  clubId: string;
  createdBy: string;
  template: ClubFootballCampTemplate;
  language: "de" | "en";
}): Promise<ClubCampEventRow> {
  const payload = templatePayload(params.template, params.clubId, params.createdBy, params.language);

  const { data: existing, error: findErr } = await supabase
    .from("events")
    .select("id")
    .eq("club_id", params.clubId)
    .eq("import_key", params.template.importKey)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing?.id) {
    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", existing.id)
      .eq("club_id", params.clubId)
      .select("*")
      .single();
    if (error) throw error;
    return data as ClubCampEventRow;
  }

  const { data, error } = await supabase.from("events").insert(payload).select("*").single();
  if (error) throw error;
  return data as ClubCampEventRow;
}

export async function publishAllClubCampTemplates(params: {
  clubId: string;
  createdBy: string;
  language: "de" | "en";
}): Promise<ClubCampEventRow[]> {
  const results: ClubCampEventRow[] = [];
  for (const template of CLUB_FOOTBALL_CAMP_TEMPLATES) {
    const row = await upsertClubCampFromTemplate({ ...params, template });
    results.push(row);
  }
  return results;
}

export function isCampEvent(event: { event_type?: string | null }): boolean {
  return event.event_type === "camp";
}
