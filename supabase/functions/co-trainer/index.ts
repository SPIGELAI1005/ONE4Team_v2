import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { edgeCorsHeaders } from "../_shared/cors.ts";
import { enforceLlmRateLimitOrResponse, PayloadTooLargeError, readJsonBodyLimited } from "../_shared/edge_guard.ts";
import {
  assertClubAdmin,
  assertClubMember,
  createSupabaseAdmin,
  fetchClubLlmSettings,
  getUserIdFromRequest,
  pingLlm,
  resolveLlmCredentials,
  streamChat,
} from "../_shared/llm.ts";
import { clubHasPlanFeature } from "../_shared/plan_entitlements.ts";
import {
  buildCoTrainerSystemPromptForRole,
  detectObviousOffScope,
  extractLatestUserMessage,
  getScopeRefusalMessage,
  parseAiLanguage,
  streamScopeRefusal,
  type CoTrainerAiRole,
} from "../_shared/ai4team_scope.ts";
import { assertClubTrainer } from "../_shared/ai4team_agent_tools.ts";
import { logStructured, resolveCorrelationId } from "../_shared/request_context.ts";

const MAX_BODY_BYTES = 600_000;

serve(async (req) => {
  const corsHeaders = edgeCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = resolveCorrelationId(req);
  logStructured("info", "co-trainer request", {
    correlationId,
    facet: "co_trainer",
    method: req.method,
  });

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
    const clubId = body.club_id;
    if (!clubId || typeof clubId !== "string") {
      return new Response(JSON.stringify({ error: "club_id is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createSupabaseAdmin();
    const member = await assertClubMember(admin, userId, clubId);
    if (!member) {
      return new Response(JSON.stringify({ error: "Not a member of this club." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.mode === "health") {
      const isAdmin = await assertClubAdmin(admin, userId, clubId);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Club admin required to test the AI connection." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const clubRow = await fetchClubLlmSettings(admin, clubId);
      const creds = resolveLlmCredentials(clubRow);
      if (!creds) {
        return new Response(
          JSON.stringify({
            ok: false,
            configured: false,
            error:
              "No LLM configured. Add API keys under Settings → Club, or set OPENAI_API_KEY on the Supabase project.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const source = clubRow?.api_key?.trim() ? "club" : "platform";
      const ping = await pingLlm(creds);
      if (!ping.ok) {
        return new Response(
          JSON.stringify({ ok: false, configured: true, source, error: ping.detail ?? "Provider check failed." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true, configured: true, source }), {
        status: 200,
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

    const messages = body.messages;
    const context = typeof body.context === "string" ? body.context : "";
    const lang = parseAiLanguage(body.language, context);

    const latestUser = extractLatestUserMessage(messages);
    const offScope = detectObviousOffScope(latestUser);
    if (offScope.blocked) {
      logStructured("warn", "ai4team off-scope request (heuristic)", {
        correlationId,
        facet: "co_trainer",
        clubId,
        category: offScope.category ?? "unrelated",
        preview: latestUser.slice(0, 120),
      });
      return streamScopeRefusal(
        getScopeRefusalMessage(lang, offScope.category ?? "unrelated"),
        corsHeaders,
      );
    }

    const clubRow = await fetchClubLlmSettings(admin, clubId);
    const creds = resolveLlmCredentials(clubRow);
    if (!creds) {
      return new Response(
        JSON.stringify({
          error:
            "No LLM configured. Add API keys under Settings → Club (admin), or set OPENAI_API_KEY for the project.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [isClubAdmin, isClubTrainer, membershipRes] = await Promise.all([
      assertClubAdmin(admin, userId, clubId),
      assertClubTrainer(admin, userId, clubId),
      admin
        .from("club_memberships")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    let aiRole: CoTrainerAiRole = "member";
    if (isClubAdmin) aiRole = "admin";
    else if (isClubTrainer) aiRole = "trainer";
    else {
      const legacyRole = (membershipRes.data?.role ?? "").toLowerCase();
      if (legacyRole === "player") aiRole = "player";
      else if (legacyRole === "parent") aiRole = "parent";
      else if (legacyRole === "staff") aiRole = "staff";
    }

    const systemPrompt = buildCoTrainerSystemPromptForRole(
      aiRole,
      context,
      lang,
      clubRow?.club_ai_instructions ?? null,
    );

    const response = await streamChat(creds, systemPrompt, Array.isArray(messages) ? messages : []);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("LLM error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("co-trainer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
