import { supabase } from "@/integrations/supabase/client";

export type Ai4TChatMode = "club" | "internet";

const PRO_INTERNET_PLANS = new Set(["pro", "champions", "bespoke"]);

export function planIncludesAiInternet(planId: string | null | undefined): boolean {
  if (!planId) return false;
  return PRO_INTERNET_PLANS.has(planId.toLowerCase());
}

export async function fetchInternetResearchEnabled(clubId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("club_llm_settings")
    .select("internet_research_enabled")
    .eq("club_id", clubId)
    .maybeSingle();
  if (error || !data) return true;
  return data.internet_research_enabled !== false;
}

export async function hasAiInternetConsent(clubId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_ai_internet_consent", { _club_id: clubId });
  if (error) return false;
  return Boolean(data);
}

export async function recordAiInternetConsent(clubId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("record_ai_internet_consent", { _club_id: clubId });
  if (error) return false;
  return Boolean(data);
}

export interface InternetSourceLink {
  title: string;
  url: string;
}

export function parseInternetMetaFromSse(parsed: Record<string, unknown>): InternetSourceLink[] | null {
  const meta = parsed.one4team_meta as { sources?: InternetSourceLink[] } | undefined;
  if (!meta?.sources?.length) return null;
  return meta.sources.filter((s) => s.url);
}
