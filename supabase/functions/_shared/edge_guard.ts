import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function readJsonBodyLimited(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  return req.arrayBuffer().then((raw) => {
    if (raw.byteLength > maxBytes) {
      throw new PayloadTooLargeError(maxBytes);
    }
    const text = new TextDecoder().decode(raw);
    if (!text.trim()) return {};
    try {
      const v = JSON.parse(text) as unknown;
      return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    } catch {
      throw new SyntaxError("Invalid JSON body");
    }
  });
}

export class PayloadTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super("Payload too large");
    this.name = "PayloadTooLargeError";
  }
}

/** Returns a 429/503 Response if limited, or null when the request may proceed. */
export async function enforceLlmRateLimitOrResponse(
  admin: SupabaseClient,
  userId: string,
  clubId: string,
  cors: Record<string, string>,
): Promise<Response | null> {
  const raw = Deno.env.get("LLM_MAX_REQ_PER_MINUTE");
  const max = Math.min(200, Math.max(1, Number(raw ?? "24")));

  const { data, error } = await admin.rpc("consume_edge_llm_quota", {
    _user_id: userId,
    _club_id: clubId,
    _max_per_minute: max,
  });

  if (error) {
    console.error("consume_edge_llm_quota:", error.message);
    return new Response(JSON.stringify({ error: "Rate limit check failed." }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const row = data as { allowed?: boolean } | null;
  if (!row?.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  return null;
}
