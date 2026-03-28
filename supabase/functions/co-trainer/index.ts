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

const MAX_BODY_BYTES = 600_000;

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
    const context = body.context;
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

    const systemPrompt = `You are "Co-Trainer", an expert AI sports assistant for a club management platform called ONE4Team. You help coaches and administrators with:

- **Lineup suggestions**: Based on player form, attendance, and position preferences
- **Tactical insights**: Analyze team strengths, weaknesses, and opponent patterns  
- **Training recommendations**: Suggest drills, session plans, and focus areas
- **Performance analysis**: Identify trends, standout players, and areas for improvement
- **Motivation**: Provide encouraging, professional coaching advice

## Structured club context (authoritative when present)
The client sends a markdown document with sections such as:
- **Club** name, club id, UI language
- **Members**: active counts, role distribution, recent joins, roster snapshot (names, roles, positions, teams)
- **Schedule (next 7 days)**: activities, club events, upcoming matches
- **Recent match results**: last completed matches with scores when available
- **Finance**: unpaid dues count for admins only; omitted for non-admins
- **Additional context (from app link)**: optional JSON or notes from deep links (e.g. a specific member or match)

Use this data explicitly when answering. If a section is missing or says "(none)", say so briefly and proceed with general coaching advice. Never invent specific member names, scores, or financial numbers that are not in the context.

Full context:
${context || "No additional context provided."}

Guidelines:
- Be concise, actionable, and motivational
- Use football/sports terminology naturally
- Format responses with clear sections using markdown
- When suggesting lineups, consider player form and fitness
- Always encourage team spirit and development
- Use emojis sparingly for visual appeal (⚽ 🏆 💪 📊)`;

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
