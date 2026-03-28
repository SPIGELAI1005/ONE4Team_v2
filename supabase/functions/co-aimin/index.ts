import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import { enforceLlmRateLimitOrResponse, PayloadTooLargeError, readJsonBodyLimited } from "../_shared/edge_guard.ts";
import {
  assertClubMember,
  createSupabaseAdmin,
  fetchClubLlmSettings,
  getUserIdFromRequest,
  completeChat,
  resolveLlmCredentials,
} from "../_shared/llm.ts";
import { clubHasPlanFeature } from "../_shared/plan_entitlements.ts";

const MAX_BODY_BYTES = 280_000;

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userId = await getUserIdFromRequest(req, supabaseUrl, serviceKey);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Sign in required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonBodyLimited(req, MAX_BODY_BYTES);
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return new Response(JSON.stringify({ error: "Request body too large." }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = body.payload;
    const clubId = body.club_id;
    if (!clubId || typeof clubId !== "string") {
      return new Response(JSON.stringify({ error: "club_id is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createSupabaseAdmin();
    if (!(await assertClubMember(admin, userId, clubId))) {
      return new Response(JSON.stringify({ error: "Not a member of this club." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planCheck = await clubHasPlanFeature(admin, clubId, "ai");
    if (!planCheck.allowed) {
      return new Response(JSON.stringify({ error: planCheck.detail ?? "Plan does not include AI." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimited = await enforceLlmRateLimitOrResponse(admin, userId, clubId, corsHeaders);
    if (rateLimited) return rateLimited;

    const creds = resolveLlmCredentials(await fetchClubLlmSettings(admin, clubId));
    if (!creds) {
      return new Response(
        JSON.stringify({
          error:
            "No LLM configured. Add API keys under Settings → Club (admin), or set OPENAI_API_KEY for the project.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are "Co-AImin", an operations assistant for ONE4Team admins.

You produce concise, actionable operational digests based on club data.
Always return:
1) Executive Summary
2) Risks and Alerts
3) Recommended Actions (prioritized)
4) Suggested follow-up checks

Be practical, short, and suitable for administrative decision-making.
Use markdown headings and bullets.
Do not invent numbers that are not present in the provided payload.`;

    const { text, error, status } = await completeChat(creds, systemPrompt, JSON.stringify(payload ?? {}));
    if (error) {
      return new Response(JSON.stringify({ error: error || "AI service unavailable." }), {
        status: status ?? 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ output: text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
