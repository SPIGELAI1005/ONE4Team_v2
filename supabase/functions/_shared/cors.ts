/**
 * CORS for browser-invoked Edge Functions.
 * Production should always set EDGE_ALLOWED_ORIGINS as a comma-separated allowlist.
 */
export function edgeCorsHeaders(req: Request): Record<string, string> {
  const allow = Deno.env.get("EDGE_ALLOWED_ORIGINS")?.trim();
  const origin = req.headers.get("origin");
  const baseHeaders = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (allow && origin) {
    const allowed = allow.split(",").map((o) => o.trim()).filter(Boolean);
    if (allowed.includes(origin)) {
      return {
        "Access-Control-Allow-Origin": origin,
        ...baseHeaders,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      };
    }
    return {
      "Access-Control-Allow-Origin": "null",
      ...baseHeaders,
      "Vary": "Origin",
    };
  }

  if (!allow && origin) {
    // Fail closed when allowlist is missing. Keep local development ergonomic.
    const isLocalhost =
      origin.startsWith("http://localhost:") ||
      origin.startsWith("https://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("https://127.0.0.1:");
    if (isLocalhost) {
      return {
        "Access-Control-Allow-Origin": origin,
        ...baseHeaders,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      };
    }
    return {
      "Access-Control-Allow-Origin": "null",
      ...baseHeaders,
      "Vary": "Origin",
    };
  }

  // Server-to-server calls without browser Origin header do not need CORS origin headers.
  return {
    ...baseHeaders,
  };
}
