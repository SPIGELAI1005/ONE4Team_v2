/**
 * AI 4 T GPT Internet — search + stream orchestration.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { ResolvedLlmCall } from "./llm.ts";
import { streamChat } from "./llm.ts";
import { buildInternetResearchSystemPromptForRole } from "./one4team_gpt_internet_prompt.ts";
import type { AiLanguage, CoTrainerAiRole } from "./ai4team_scope.ts";
import {
  buildInternetSearchQuery,
  formatWebSearchBlock,
  isWebSearchConfigured,
  runWebSearch,
  type WebSearchResult,
} from "./web_search.ts";

function openAiSsePayload(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function prependStreamMeta(source: ReadableStream<Uint8Array>, metaLine: string): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const enc = new TextEncoder();
  let metaSent = false;

  return new ReadableStream({
    async pull(controller) {
      if (!metaSent) {
        controller.enqueue(enc.encode(metaLine));
        metaSent = true;
      }
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
  });
}

export async function logInternetResearchUsage(
  admin: SupabaseClient,
  args: {
    clubId: string;
    userId: string;
    searchQuery: string;
    sources: WebSearchResult[];
  },
): Promise<void> {
  const { error } = await admin.from("ai_internet_usage_log").insert({
    club_id: args.clubId,
    user_id: args.userId,
    search_query: args.searchQuery,
    sources: args.sources.map((s) => ({ title: s.title, url: s.url })),
  });
  if (error) console.error("ai_internet_usage_log:", error.message);
}

export async function streamInternetResearchChat(args: {
  admin: SupabaseClient;
  creds: ResolvedLlmCall;
  clubId: string;
  userId: string;
  clubName: string | null;
  aiRole: CoTrainerAiRole;
  context: string;
  lang: AiLanguage;
  clubInstructions?: string | null;
  messages: Array<{ role: string; content: string }>;
  userQuery: string;
  corsHeaders: Record<string, string>;
}): Promise<Response> {
  if (!isWebSearchConfigured()) {
    return new Response(
      JSON.stringify({
        error:
          "Web search is not configured on the platform (TAVILY_API_KEY). Ask your platform operator to enable AI 4 T GPT Internet.",
      }),
      { status: 503, headers: { ...args.corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const searchQuery = buildInternetSearchQuery(args.userQuery, args.clubName);
  const searchResults = await runWebSearch(searchQuery, 5);

  await logInternetResearchUsage(args.admin, {
    clubId: args.clubId,
    userId: args.userId,
    searchQuery,
    sources: searchResults,
  });

  const searchBlock = formatWebSearchBlock(searchResults);
  const basePrompt = buildInternetResearchSystemPromptForRole(
    args.aiRole,
    args.context,
    args.lang,
    args.clubInstructions,
  );
  const systemPrompt = `${basePrompt}\n\n${searchBlock}`;

  const llmResponse = await streamChat(args.creds, systemPrompt, args.messages);
  if (!llmResponse.ok || !llmResponse.body) {
    return llmResponse;
  }

  const metaLine = openAiSsePayload({
    one4team_meta: {
      mode: "internet",
      sources: searchResults.map((s) => ({ title: s.title, url: s.url })),
      searchConfigured: true,
    },
  });

  const body = prependStreamMeta(llmResponse.body, metaLine);
  return new Response(body, {
    headers: { ...args.corsHeaders, "Content-Type": "text/event-stream" },
  });
}

export async function userHasInternetConsent(
  admin: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("ai_internet_consents")
    .select("user_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (error) {
    console.error("ai_internet_consents:", error.message);
    return false;
  }
  return Boolean(data);
}
