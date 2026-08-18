/** Build HTTPS / webcal feed URLs for Edge `calendar-ics`. */

export function getSupabaseFunctionsBaseUrl(
  supabaseUrl: string | undefined | null = import.meta.env.VITE_SUPABASE_URL,
): string | null {
  const raw = (supabaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!u.protocol.startsWith("http")) return null;
    return `${u.origin}/functions/v1`;
  } catch {
    return null;
  }
}

export function buildCalendarIcsFeedUrl(input: {
  token: string;
  supabaseUrl?: string | null;
}): string | null {
  const token = input.token.trim();
  if (!token) return null;
  const base = getSupabaseFunctionsBaseUrl(input.supabaseUrl);
  if (!base) return null;
  return `${base}/calendar-ics?token=${encodeURIComponent(token)}`;
}

export function toWebcalUrl(httpsFeedUrl: string): string {
  return httpsFeedUrl.replace(/^https:/i, "webcal:").replace(/^http:/i, "webcal:");
}
