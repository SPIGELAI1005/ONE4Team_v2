/**
 * Multi-provider LLM routing for ONE4Team edge functions.
 * Streams are normalized to OpenAI-style SSE (data: {"choices":[{"delta":{"content"}}]}).
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type LlmProvider = "openai" | "anthropic" | "google_gemini" | "azure_openai" | "github_models";

export interface ClubLlmSettingsRow {
  club_id: string;
  provider: LlmProvider;
  api_key: string;
  model: string | null;
  azure_endpoint: string | null;
  azure_api_version: string | null;
}

const DEFAULTS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
  google_gemini: "gemini-1.5-flash",
  azure_openai: "gpt-4o",
  github_models: "gpt-4o",
};

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";

export function createSupabaseAdmin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, key);
}

/** Returns user id from Supabase JWT, or null if invalid / anon key. */
export async function getUserIdFromRequest(req: Request, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  if (!auth) return null;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(auth);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export async function assertClubMember(
  admin: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("is_member_of_club", { _user_id: userId, _club_id: clubId });
  if (error) {
    console.error("is_member_of_club:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function assertClubAdmin(
  admin: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("is_club_admin", { _user_id: userId, _club_id: clubId });
  if (error) {
    console.error("is_club_admin:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function fetchClubLlmSettings(
  admin: SupabaseClient,
  clubId: string,
): Promise<ClubLlmSettingsRow | null> {
  const { data, error } = await admin.from("club_llm_settings").select("*").eq("club_id", clubId).maybeSingle();
  if (error) {
    console.error("club_llm_settings:", error.message);
    return null;
  }
  return data as ClubLlmSettingsRow | null;
}

export interface ResolvedLlmCall {
  provider: LlmProvider | "openai";
  apiKey: string;
  model: string;
  azureEndpoint: string | null;
  azureApiVersion: string;
}

/** Club row wins; else platform OPENAI_* env fallback. */
export function resolveLlmCredentials(
  club: ClubLlmSettingsRow | null,
): ResolvedLlmCall | null {
  if (club?.api_key?.trim()) {
    const p = club.provider as LlmProvider;
    return {
      provider: p,
      apiKey: club.api_key.trim(),
      model: (club.model?.trim() || DEFAULTS[p]) ?? DEFAULTS.openai,
      azureEndpoint: club.azure_endpoint?.trim() || null,
      azureApiVersion: club.azure_api_version?.trim() || "2024-02-15-preview",
    };
  }
  const platformKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!platformKey) return null;
  return {
    provider: "openai",
    apiKey: platformKey,
    model: Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini",
    azureEndpoint: null,
    azureApiVersion: "2024-02-15-preview",
  };
}

function openAiStyleDelta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function buildOpenAiMessages(systemPrompt: string, userMessages: Array<{ role: string; content: string }>) {
  return [{ role: "system", content: systemPrompt }, ...userMessages];
}

/** OpenAI, Azure OpenAI, GitHub Models (OpenAI-compatible). */
export async function streamOpenAiCompatible(args: {
  url: string;
  apiKey: string;
  authMode: "bearer" | "azure_api_key";
  body: Record<string, unknown>;
}): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (args.authMode === "bearer") headers.Authorization = `Bearer ${args.apiKey}`;
  else headers["api-key"] = args.apiKey;

  return fetch(args.url, { method: "POST", headers, body: JSON.stringify(args.body) });
}

export async function streamChat(
  creds: ResolvedLlmCall,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): Promise<Response> {
  const openAiMsgs = buildOpenAiMessages(systemPrompt, messages);
  const streamBody = { model: creds.model, messages: openAiMsgs, stream: true };

  if (creds.provider === "openai") {
    return streamOpenAiCompatible({
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: creds.apiKey,
      authMode: "bearer",
      body: streamBody,
    });
  }

  if (creds.provider === "github_models") {
    return streamOpenAiCompatible({
      url: GITHUB_MODELS_URL,
      apiKey: creds.apiKey,
      authMode: "bearer",
      body: streamBody,
    });
  }

  if (creds.provider === "azure_openai") {
    if (!creds.azureEndpoint) {
      return new Response(JSON.stringify({ error: "Azure OpenAI requires azure_endpoint on club LLM settings." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const base = creds.azureEndpoint.replace(/\/$/, "");
    const url =
      `${base}/openai/deployments/${encodeURIComponent(creds.model)}/chat/completions?api-version=${encodeURIComponent(creds.azureApiVersion)}`;
    return streamOpenAiCompatible({
      url,
      apiKey: creds.apiKey,
      authMode: "azure_api_key",
      body: { messages: openAiMsgs, stream: true },
    });
  }

  if (creds.provider === "anthropic") {
    return streamAnthropic(systemPrompt, messages, creds.model, creds.apiKey);
  }

  if (creds.provider === "google_gemini") {
    return streamGemini(systemPrompt, messages, creds.model, creds.apiKey);
  }

  return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 500, headers: { "Content-Type": "application/json" } });
}

async function streamAnthropic(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
): Promise<Response> {
  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      stream: true,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok || !res.body) return res;

  const out = anthropicSseToOpenAi(res.body);
  return new Response(out, { headers: { "Content-Type": "text/event-stream" } });
}

function anthropicSseToOpenAi(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      buffer += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          const ev = JSON.parse(jsonStr) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
            controller.enqueue(new TextEncoder().encode(openAiStyleDelta(ev.delta.text)));
          }
        } catch {
          /* ignore */
        }
      }
    },
  });
}

async function streamGemini(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
): Promise<Response> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });

  if (!res.ok || !res.body) return res;

  const out = geminiSseToOpenAi(res.body);
  return new Response(out, { headers: { "Content-Type": "text/event-stream" } });
}

function geminiSseToOpenAi(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  let prevText = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      buffer += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const obj = JSON.parse(jsonStr) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = obj.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
          if (text.length > prevText.length) {
            const delta = text.slice(prevText.length);
            prevText = text;
            if (delta) controller.enqueue(new TextEncoder().encode(openAiStyleDelta(delta)));
          }
        } catch {
          /* ignore */
        }
      }
    },
  });
}

/** Non-streaming completion for tools that expect a single string (e.g. co-aimin). */
export async function completeChat(
  creds: ResolvedLlmCall,
  systemPrompt: string,
  userContent: string,
): Promise<{ text: string; error?: string; status?: number }> {
  const messages = [{ role: "user", content: userContent }];

  if (creds.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": creds.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: creds.model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) return { text: "", error: await res.text(), status: res.status };
    const json = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = json.content?.map((c) => c.text || "").join("") || "";
    return { text };
  }

  if (creds.provider === "google_gemini") {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(creds.model)}:generateContent?key=${encodeURIComponent(creds.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
      }),
    });
    if (!res.ok) return { text: "", error: await res.text(), status: res.status };
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    return { text };
  }

  const openAiMsgs = buildOpenAiMessages(systemPrompt, messages);
  const body = { model: creds.model, messages: openAiMsgs, stream: false };

  let url: string;
  let authMode: "bearer" | "azure_api_key" = "bearer";
  if (creds.provider === "azure_openai") {
    if (!creds.azureEndpoint) return { text: "", error: "azure_endpoint required", status: 400 };
    const base = creds.azureEndpoint.replace(/\/$/, "");
    url =
      `${base}/openai/deployments/${encodeURIComponent(creds.model)}/chat/completions?api-version=${encodeURIComponent(creds.azureApiVersion)}`;
    authMode = "azure_api_key";
  } else if (creds.provider === "github_models") {
    url = GITHUB_MODELS_URL;
  } else {
    url = "https://api.openai.com/v1/chat/completions";
  }

  const res = await streamOpenAiCompatible({ url, apiKey: creds.apiKey, authMode, body });
  if (!res.ok) return { text: "", error: await res.text(), status: res.status };
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text };
}

/** Minimal non-streaming completion to verify credentials (Settings health check). */
export async function pingLlm(creds: ResolvedLlmCall): Promise<{ ok: boolean; detail?: string }> {
  const result = await completeChat(
    creds,
    "You are a connectivity test. Reply with exactly the single word OK and nothing else.",
    "OK",
  );
  if (result.error) {
    const d = result.error.trim();
    return { ok: false, detail: d.length > 280 ? `${d.slice(0, 280)}…` : d };
  }
  if (!result.text?.trim()) return { ok: false, detail: "Empty response from provider" };
  return { ok: true };
}
