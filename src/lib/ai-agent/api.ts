import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";
import type {
  AgentExecuteResponse,
  AgentPageContext,
  AgentIntent,
  AgentProposeResponse,
  AgentClarifyResponse,
  AgentTeamAccessDeniedResponse,
  AgentInterpretResponse,
} from "./types";

export type AgentInterpretResult =
  | AgentInterpretResponse
  | AgentClarifyResponse
  | AgentTeamAccessDeniedResponse
  | null;

function supabaseFunctionsBase(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (!raw) throw new Error("missing_supabase_url");
  return `${String(raw).trim().replace(/\/+$/, "")}/functions/v1/ai4team-agent`;
}

async function parseAgentJson(resp: Response): Promise<Record<string, unknown>> {
  try {
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function parseAgentError(resp: Response, data?: Record<string, unknown>): Promise<string> {
  if (data?.error && typeof data.error === "string") return data.error;
  if (data?.kind === "team_access_denied" && typeof data.error === "string") return data.error;
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
  timezone?: string;
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
      timezone: input.timezone ?? null,
      page_context: input.pageContext ?? {},
      conversation_id: input.conversationId ?? null,
    }),
  });

  const data = await parseAgentJson(resp);

  if (!resp.ok) {
    if (data.kind === "team_access_denied") {
      throw Object.assign(new Error(String(data.error ?? "Access denied")), { agentDenied: data });
    }
    throw new Error(await parseAgentError(resp, data));
  }

  if (data.kind === "clarify") {
    throw Object.assign(new Error(String(data.question ?? "Clarification needed")), { agentClarify: data });
  }

  return data as unknown as AgentProposeResponse;
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

  const data = await parseAgentJson(resp);

  if (resp.status === 204 || resp.status === 404) return null;
  if (data.kind === "chat") return null;
  if (data.kind === "clarify") return null;

  if (!resp.ok) {
    if (data.kind === "team_access_denied") {
      throw Object.assign(new Error(String(data.error ?? "Access denied")), { agentDenied: data });
    }
    throw new Error(await parseAgentError(resp, data));
  }

  return data as unknown as AgentProposeResponse;
}

/** Interpret voice/text for Agent tab form fill (no DB proposal yet). */
export async function interpretAgentFromMessage(input: {
  clubId: string;
  message: string;
  language: "en" | "de";
  pageContext?: AgentPageContext;
  timezone?: string;
}): Promise<AgentInterpretResult> {
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

  const data = await parseAgentJson(resp);

  if (data.kind === "chat") return null;

  if (!resp.ok) {
    if (data.kind === "team_access_denied") {
      return data as unknown as AgentTeamAccessDeniedResponse;
    }
    throw new Error(await parseAgentError(resp, data));
  }

  if (data.kind === "clarify") {
    return data as unknown as AgentClarifyResponse;
  }

  if (data.kind === "team_access_denied") {
    return data as unknown as AgentTeamAccessDeniedResponse;
  }

  if (data.kind === "workflow" && data.intent && data.params) {
    return data as unknown as AgentInterpretResponse;
  }

  return null;
}

export async function executeAgentRun(input: {
  clubId: string;
  runId: string;
  idempotencyKey: string;
  cancelActivityId?: string | null;
  timezone?: string;
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
      cancel_activity_id: input.cancelActivityId ?? null,
      timezone: input.timezone ?? null,
    }),
  });

  const data = (await resp.json()) as AgentExecuteResponse & { error?: string };
  if (!resp.ok) {
    throw new Error(data.error ?? `Execution failed (${resp.status})`);
  }
  return data;
}
