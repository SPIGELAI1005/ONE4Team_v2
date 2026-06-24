import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";
import { formatClubContextForPrompt } from "@/lib/ai-context";
import { AI_4_T_BRAND } from "@/components/ai/Ai4TBrand";

export interface Ai4TChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function parseCoTrainerEdgeError(resp: Response): Promise<string> {
  const raw = await resp.text();
  const trimmed = raw.trim();
  if (!trimmed) return `HTTP ${resp.status}`;
  try {
    const j = JSON.parse(trimmed) as { error?: string; message?: string };
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
  } catch {
    /* not JSON */
  }
  if (trimmed.length > 320) return `${trimmed.slice(0, 320)}…`;
  return trimmed;
}

export function formatAi4tThrownError(e: unknown): string {
  if (e instanceof Error && e.message?.trim()) return e.message.trim();
  const s = String(e);
  if (s === "[object Object]") return "Unknown error (see browser console)";
  return s.length > 240 ? `${s.slice(0, 240)}…` : s;
}

const DEMO_SNIPPETS: Record<string, string> = {
  lineup: "## Suggested lineup\n\nBased on recent form, a **4-3-3** with your in-form striker up front and a compact midfield pivot is a solid starting point.",
  training:
    "## Training plan\n\n**Mon:** recovery + video\n**Tue:** pressing triggers\n**Thu:** set pieces + transitions\n**Fri:** tactical polish",
  performance:
    "## Performance snapshot\n\nStrengths: possession and passing. Improve defensive transitions and shot efficiency in the final third.",
  motivate: "## Team talk\n\nPlay for each other, trust the plan, and leave everything on the pitch today.",
};

export function getAi4tDemoResponse(
  userMessage: string,
  assistantRoleName: string,
  demo: { intro: string; note: string },
): string {
  const lower = userMessage.toLowerCase();
  if (
    lower.includes("who are you")
    || lower.includes("what are you")
    || lower.includes("wer bist du")
    || lower.includes("was bist du")
  ) {
    return `I am **${AI_4_T_BRAND}**, your club's intelligent assistant in ONE4Team. I help with lineup ideas, tactical notes, training plans, performance analysis, and club operations using your organization's context.`;
  }
  if (lower.includes("lineup") || lower.includes("starting xi") || lower.includes("formation"))
    return DEMO_SNIPPETS.lineup;
  if (lower.includes("training") || lower.includes("plan") || lower.includes("session") || lower.includes("week"))
    return DEMO_SNIPPETS.training;
  if (lower.includes("analy") || lower.includes("performance") || lower.includes("review") || lower.includes("improve"))
    return DEMO_SNIPPETS.performance;
  if (lower.includes("motiv") || lower.includes("speech") || lower.includes("inspire") || lower.includes("cup"))
    return DEMO_SNIPPETS.motivate;
  const head = demo.intro.replace("{role}", assistantRoleName);
  return `${head}\n\n- Lineup and tactical ideas\n- Training session plans\n- Match preparation\n- Club operations (when permitted)\n\n${demo.note}`;
}

export interface StreamCoTrainerChatInput {
  clubId: string;
  messages: Ai4TChatMessage[];
  clubContextText: string;
  language: "en" | "de";
  assistantRoleName: string;
  demoCopy: { intro: string; note: string };
  errorCopy: {
    invalidSupabaseUrl: string;
    noClub: string;
    signIn: string;
    serialize: string;
    noStream: string;
    emptyResponse: string;
    network: string;
    detailPrefix: string;
    heading: string;
    hint: string;
  };
  onChunk: (assistantSoFar: string) => void;
  onError: (markdownBody: string, toastDescription: string) => void;
  simulateStream: (text: string, onChunk: (assistantSoFar: string) => void) => Promise<void>;
}

export async function streamCoTrainerChat(input: StreamCoTrainerChatInput): Promise<string> {
  let assistantSoFar = "";

  const upsert = (chunk: string) => {
    assistantSoFar += chunk;
    input.onChunk(assistantSoFar);
  };

  const setFull = (full: string) => {
    assistantSoFar = full;
    input.onChunk(full);
  };

  const showError = (description: string, includeHint: boolean) => {
    const body = includeHint
      ? `**${input.errorCopy.heading}**\n\n${description}\n\n${input.errorCopy.hint}`
      : `**${input.errorCopy.heading}**\n\n${description}`;
    input.onError(body, description);
  };

  try {
    const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrlRaw) {
      const lastUserMsg = input.messages[input.messages.length - 1]?.content || "";
      const demoText = getAi4tDemoResponse(lastUserMsg, input.assistantRoleName, input.demoCopy);
      await input.simulateStream(demoText, (text) => {
        assistantSoFar = text;
        input.onChunk(text);
      });
      return assistantSoFar;
    }

    const supabaseUrl = String(supabaseUrlRaw).trim().replace(/\/+$/, "");
    try {
      new URL(`${supabaseUrl}/functions/v1/co-trainer`);
    } catch {
      showError(input.errorCopy.invalidSupabaseUrl, false);
      return assistantSoFar;
    }

    if (!input.clubId) {
      showError(input.errorCopy.noClub, false);
      return assistantSoFar;
    }

    const authHeaders = await getEdgeFunctionAuthHeaders();
    if (!authHeaders.Authorization) {
      showError(input.errorCopy.signIn, false);
      return assistantSoFar;
    }

    const contextPayload = formatClubContextForPrompt(
      input.clubContextText || `Club ID: ${input.clubId} | Language: ${input.language}`,
      null,
    );

    let bodyStr: string;
    try {
      bodyStr = JSON.stringify({
        club_id: input.clubId,
        messages: input.messages,
        context: contextPayload,
        language: input.language,
      });
    } catch {
      showError(input.errorCopy.serialize, false);
      return assistantSoFar;
    }

    const resp = await fetch(`${supabaseUrl}/functions/v1/co-trainer`, {
      method: "POST",
      headers: authHeaders,
      body: bodyStr,
    });

    if (!resp.ok) {
      showError(await parseCoTrainerEdgeError(resp), true);
      return assistantSoFar;
    }

    if (!resp.body) {
      showError(input.errorCopy.noStream, true);
      return assistantSoFar;
    }

    let streamModelError: string | null = null;

    const processSseLine = (line: string) => {
      if (streamModelError) return;
      if (line.startsWith(":") || line.trim() === "") return;
      if (!line.startsWith("data: ")) return;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr) as {
          choices?: Array<{ delta?: { content?: string } }>;
          error?: { message?: string; code?: string; type?: string } | string;
        };
        if (parsed.error != null) {
          streamModelError =
            typeof parsed.error === "string"
              ? parsed.error
              : parsed.error?.message ||
                [parsed.error?.type, parsed.error?.code].filter(Boolean).join(" ") ||
                "Stream error from model";
          return;
        }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) upsert(content);
      } catch {
        /* partial SSE */
      }
    };

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (!streamModelError) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        processSseLine(line);
        if (streamModelError) break;
      }
    }

    if (!streamModelError) {
      textBuffer += decoder.decode();
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        processSseLine(line);
        if (streamModelError) break;
      }
      if (textBuffer.trim()) processSseLine(textBuffer);
    }

    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }

    if (streamModelError) {
      showError(streamModelError, true);
      return assistantSoFar;
    }

    if (!assistantSoFar.trim()) {
      showError(input.errorCopy.emptyResponse, true);
    }
  } catch (e) {
    const detail = formatAi4tThrownError(e);
    const msg =
      detail.length > 0
        ? `${input.errorCopy.network}\n\n${input.errorCopy.detailPrefix} ${detail}`
        : input.errorCopy.network;
    if (assistantSoFar.trim()) {
      setFull(`${assistantSoFar.trim()}\n\n---\n\n**${input.errorCopy.heading}**\n\n${msg}`);
      input.onError(msg, detail || msg);
    } else {
      showError(msg, true);
    }
  }

  return assistantSoFar;
}
