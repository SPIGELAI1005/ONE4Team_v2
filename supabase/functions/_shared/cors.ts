/** CORS for browser-invoked Edge Functions. Set EDGE_ALLOWED_ORIGINS=comma-separated list; otherwise falls back to *. */
export function edgeCorsHeaders(req: Request): Record<string, string> {
  const allow = Deno.env.get("EDGE_ALLOWED_ORIGINS")?.trim();
  const origin = req.headers.get("origin");
  if (allow && origin) {
    const allowed = allow.split(",").map((o) => o.trim()).filter(Boolean);
    if (allowed.includes(origin)) {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      };
    }
    return {
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
