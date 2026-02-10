import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, matchData, teamData, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ matchData, teamData }) },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-match-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
