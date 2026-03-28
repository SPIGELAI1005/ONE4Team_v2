import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertClubMember,
  createSupabaseAdmin,
  fetchClubLlmSettings,
  getUserIdFromRequest,
  resolveLlmCredentials,
  streamChat,
} from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { type, matchData, teamData, context, club_id: clubId } = await req.json();
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

    let systemPrompt = "";

    if (type === "preview") {
      systemPrompt = `You are a professional football/sports analyst. Generate a concise pre-match preview analysis.

Given the match data and recent form, provide:
1. **Match Overview** - Brief context of the fixture
2. **Form Guide** - Recent results analysis
3. **Key Factors** - What could decide the match
4. **Prediction** - Your predicted outcome with reasoning

Keep it concise (under 300 words). Use markdown formatting. Be confident and analytical.
${context || ""}`;
    } else if (type === "report") {
      systemPrompt = `You are a professional sports journalist. Generate a post-match report.

Given the match data and events, write:
1. **Match Summary** - What happened in the game
2. **Key Moments** - Highlight the crucial events
3. **Player Ratings** - Rate standout performers (if event data available)
4. **Takeaways** - What to take from this result

Keep it concise (under 400 words). Use markdown. Be descriptive and engaging.
${context || ""}`;
    } else if (type === "training") {
      systemPrompt = `You are an expert sports coach. Based on recent match analysis, suggest a targeted training plan.

Provide:
1. **Areas to Improve** - Based on match weaknesses
2. **Weekly Plan** - Day-by-day training focus
3. **Key Drills** - Specific exercises with descriptions
4. **Recovery Notes** - Rest and recovery recommendations

Keep it actionable and practical. Under 400 words. Use markdown.
${context || ""}`;
    } else if (type === "injury_risk") {
      systemPrompt = `You are a sports science analyst. Assess potential injury risk based on player workload data.

Given player activity data, provide:
1. **Risk Assessment** - Players at high/medium/low risk
2. **Warning Signs** - What to watch for
3. **Recommendations** - Load management suggestions
4. **Recovery Protocol** - Suggested rest periods

Be data-driven and cautious. Under 300 words. Use markdown.
${context || ""}`;
    } else if (type === "stats_query") {
      systemPrompt = `You are a sports statistics assistant. Answer the user's question about team/player statistics based on the provided data. Be precise and use numbers. Format with markdown. Keep answers under 200 words.
${context || ""}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid analysis type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPayload = type === "stats_query"
      ? JSON.stringify({ stats: matchData })
      : JSON.stringify({ matchData, teamData });

    const response = await streamChat(creds, systemPrompt, [{ role: "user", content: userPayload }]);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("LLM error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-match-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
