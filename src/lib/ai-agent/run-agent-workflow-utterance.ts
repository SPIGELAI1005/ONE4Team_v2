import { shouldTryAgentInterpretation } from "@/lib/ai-agent/chat-action-heuristic";
import {
  processChatForAgentWorkflow,
  type ChatWorkflowResult,
  type PendingWorkflowState,
} from "@/lib/ai-agent/chat-workflow-handler";
import type { AgentPageContext } from "@/lib/ai-agent/types";

export interface AgentUtteranceInput {
  clubId: string;
  message: string;
  language: "en" | "de";
  pageContext?: AgentPageContext;
  conversationId?: string | null;
  pendingWorkflow?: PendingWorkflowState | null;
  canUseAgent: boolean;
}

export type AgentUtteranceResult =
  | { type: "skip" }
  | ChatWorkflowResult;

/** Shared entry for Agent tab composer, voice, and Chat-tab workflow detection. */
export async function runAgentWorkflowFromUtterance(
  input: AgentUtteranceInput,
): Promise<AgentUtteranceResult> {
  if (!input.canUseAgent || !input.message.trim()) {
    return { type: "skip" };
  }

  if (!input.pendingWorkflow && !shouldTryAgentInterpretation(input.message)) {
    return { type: "skip" };
  }

  const workflow = await processChatForAgentWorkflow({
    clubId: input.clubId,
    message: input.message,
    language: input.language,
    pageContext: input.pageContext,
    conversationId: input.conversationId ?? null,
    pendingWorkflow: input.pendingWorkflow,
    canUseAgent: true,
  });

  return workflow;
}

export function mergeActivityClarifyAnswer(
  params: Record<string, unknown>,
  answer: string,
): Record<string, unknown> {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();
  const next: Record<string, unknown> = { ...params, activity_hint: trimmed };

  if (/\b(today|heute)\b/.test(lower)) next.date_hint = "today";
  else if (/\b(tomorrow|morgen)\b/.test(lower)) next.date_hint = "tomorrow";

  const teamMatch = trimmed.match(/\b(u\s?\d+[\w-]*|jugend\s*\d+|herren|damen|senior\w*)\b/i);
  if (teamMatch?.[0]) next.team_name = teamMatch[0].replace(/\s+/g, "");

  return next;
}
