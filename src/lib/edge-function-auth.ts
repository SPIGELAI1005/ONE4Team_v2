import { supabase } from "@/integrations/supabase/client";

/** Headers for calling Supabase Edge Functions with the signed-in user (required for club-scoped LLM). */
export async function getEdgeFunctionAuthHeaders(): Promise<Record<string, string>> {
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey,
  };

  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session ?? null;
  }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}
