import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";
import type {
  AgentExecuteResponse,
  AgentPageContext,
  AgentIntent,
  AgentProposeResponse,
  AgentInterpretResponse,
} from "./types";

function supabaseFunctionsBase(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (!raw) throw new Error("missing_supabase_url");
  return `${String(raw).trim().replace(/\/+$/, "")}/functions/v1/ai4team-agent`;
}

async function parseAgentError(resp: Response): Promise<string> {
  try {
    const j = (await resp.json()) as { error?: string };
    if (j.error) return j.error;
  } catch {
    // ignore
  }
  return `Request failed (${resp.status})`;
}

export async function proposeAgentRun(input: {
  clubId: string;
  intent: AgentIntent;
  params: Record<string, unknown>;
  language: "en" | "de";
  pageContext?: AgentPageContext;
  conversationId?: string | null;
}): Promise<AgentProposeResponse> {
  const headers = await getEdgeFunctionAuthHeaders();
  const resp = await fetch(supabaseFunctionsBase(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      club_id: input.clubId,
      mode: "propose",
      intent: input.intent,
      params: input.params,
      language: input.language,
      page_context: input.pageContext ?? {},
      conversation_id: input.conversationId ?? null,
    }),
  });

  if (!resp.ok) {
    throw new Error(await parseAgentError(resp));
  }

  return (await resp.json()) as AgentProposeResponse;
}

/** Natural-language message → workflow proposal (or null = use normal chat). */
export async function proposeAgentFromMessage(input: {
  clubId: string;
  message: string;
  language: "en" | "de";
  pageContext?: AgentPageContext;
  conversationId?: string | null;
  timezone?: string;
}): Promise<AgentProposeResponse | null> {
  const headers = await getEdgeFunctionAuthHeaders();
  const resp = await fetch(supabaseFunctionsBase(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      club_id: input.clubId,
      mode: "propose",
      message: input.message,
      language: input.language,
      timezone: input.timezone ?? null,
      page_context: input.pageContext ?? { source: "co-trainer-chat" },
      conversation_id: input.conversationId ?? null,
    }),
  });

  if (resp.status === 204 || resp.status === 404) return null;

  const data = (await resp.json()) as AgentProposeResponse & { kind?: string; error?: string };

  if (data.kind === "chat") return null;

  if (!resp.ok) {
    throw new Error(data.error ?? await parseAgentError(resp));
  }

  return data;
}

/** Interpret voice/text for Agent tab form fill (no DB proposal yet). */
export async function interpretAgentFromMessage(input: {
  clubId: string;
  message: string;
  language: "en" | "de";
  pageContext?: AgentPageContext;
  timezone?: string;
}): Promise<AgentInterpretResponse | null> {
  const headers = await getEdgeFunctionAuthHeaders();
  const resp = await fetch(supabaseFunctionsBase(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      club_id: input.clubId,
      mode: "interpret",
      message: input.message,
      language: input.language,
      timezone: input.timezone ?? null,
      page_context: input.pageContext ?? { source: "co-trainer-agent" },
    }),
  });

  const data = (await resp.json()) as AgentInterpretResponse & { kind?: string; error?: string };

  if (data.kind === "chat") return null;

  if (!resp.ok) {
    throw new Error(data.error ?? (await parseAgentError(resp)));
  }

  if (data.kind === "workflow" && data.intent && data.params) {
    return data;
  }

  return null;
}

export async function executeAgentRun(input: {
  clubId: string;
  runId: string;
  idempotencyKey: string;
}): Promise<AgentExecuteResponse> {
  const headers = await getEdgeFunctionAuthHeaders();
  const resp = await fetch(supabaseFunctionsBase(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      club_id: input.clubId,
      mode: "execute",
      run_id: input.runId,
      idempotency_key: input.idempotencyKey,
    }),
  });

  const data = (await resp.json()) as AgentExecuteResponse & { error?: string };
  if (!resp.ok) {
    throw new Error(data.error ?? `Execution failed (${resp.status})`);
  }
  return data;
}
