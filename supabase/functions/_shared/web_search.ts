/** Tavily web search for AI 4 T GPT Internet mode. Requires TAVILY_API_KEY on Supabase secrets. */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function isWebSearchConfigured(): boolean {
  return Boolean(Deno.env.get("TAVILY_API_KEY")?.trim());
}

export async function runWebSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const apiKey = Deno.env.get("TAVILY_API_KEY")?.trim();
  if (!apiKey || !query.trim()) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.trim().slice(0, 400),
        max_results: Math.min(8, Math.max(1, maxResults)),
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!res.ok) {
      console.error("Tavily search failed:", res.status, await res.text());
      return [];
    }

    const json = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    return (json.results ?? [])
      .filter((row) => row.url)
      .map((row) => ({
        title: String(row.title ?? row.url ?? "Source").trim(),
        url: String(row.url).trim(),
        snippet: String(row.content ?? "").trim().slice(0, 600),
      }));
  } catch (e) {
    console.error("runWebSearch:", e);
    return [];
  }
}

export function formatWebSearchBlock(results: WebSearchResult[]): string {
  if (!results.length) {
    return "No web results were returned for this query. Answer from club context and general football knowledge; say when information may be outdated.";
  }

  return results
    .map(
      (row, index) =>
        `${index + 1}. **${row.title}** (${row.url})\n   ${row.snippet || "(no snippet)"}`,
    )
    .join("\n\n");
}

/** Build a focused search query from the user message and club name. */
export function buildInternetSearchQuery(userMessage: string, clubName: string | null): string {
  const club = clubName?.trim() || "amateur football club";
  const msg = userMessage.trim().slice(0, 280);
  return `${msg} — ${club} Germany amateur football context`.slice(0, 400);
}
