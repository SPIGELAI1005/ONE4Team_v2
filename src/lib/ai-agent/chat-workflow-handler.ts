import { getBrowserTimezone } from "@/lib/ai-agent/voice-text";
import { enrichAgentProposalDisplay, cancelProposalIsExecutable } from "@/lib/ai-agent/enrich-agent-proposal";
import { interpretAgentFromMessage, proposeAgentRun } from "@/lib/ai-agent/api";
import type {
  AgentClarifyResponse,
  AgentIntent,
  AgentPageContext,
  AgentProposeResponse,
  AgentTeamAccessDeniedResponse,
} from "@/lib/ai-agent/types";

export function extractAgentDenied(error: unknown): AgentTeamAccessDeniedResponse | null {
  if (!error || typeof error !== "object" || !("agentDenied" in error)) return null;
  const denied = (error as { agentDenied: unknown }).agentDenied;
  if (!denied || typeof denied !== "object") return null;
  const body = denied as AgentTeamAccessDeniedResponse;
  return body.kind === "team_access_denied" ? body : null;
}

export interface PendingWorkflowState {
  intent: AgentIntent;
  params: Record<string, unknown>;
  missingField: "reason" | "activity_id";
}

export type ChatWorkflowResult =
  | { type: "chat" }
  | { type: "clarify"; question: string; pending: PendingWorkflowState }
  | { type: "proposal"; proposal: AgentProposeResponse }
  | { type: "denied"; body: AgentTeamAccessDeniedResponse }
  | { type: "error"; message: string };

import { mergeActivityClarifyAnswer } from "@/lib/ai-agent/run-agent-workflow-utterance";

function mergePendingAnswer(pending: PendingWorkflowState, answer: string): Record<string, unknown> {
  const trimmed = answer.trim();
  if (pending.missingField === "reason") {
    return { ...pending.params, reason: trimmed };
  }
  return mergeActivityClarifyAnswer(pending.params, trimmed);
}

function extractAgentClarify(error: unknown): AgentClarifyResponse | null {
  if (!error || typeof error !== "object" || !("agentClarify" in error)) return null;
  const clarify = (error as { agentClarify: unknown }).agentClarify;
  if (!clarify || typeof clarify !== "object") return null;
  const body = clarify as Record<string, unknown>;
  if (typeof body.question !== "string" || typeof body.intent !== "string" || typeof body.field !== "string") {
    return null;
  }
  return body as AgentClarifyResponse;
}

function isCancelProposal(proposal: AgentProposeResponse): boolean {
  return Boolean(proposal.proposal?.steps?.some((step) => step.tool === "cancel_training"));
}

function unresolvedCancelClarify(
  intent: AgentIntent,
  params: Record<string, unknown>,
  language: "en" | "de",
): ChatWorkflowResult {
  return {
    type: "clarify",
    question:
      language === "de"
        ? "Welches Training soll abgesagt werden? Bitte Team und Datum nennen (z. B. U12-1 heute 18:00)."
        : "Which training should be cancelled? Please name the team and date (e.g. U12-1 today 6pm).",
    pending: { intent, params, missingField: "activity_id" },
  };
}

async function finalizeProposal(
  proposal: AgentProposeResponse,
  clubId: string,
  language: "en" | "de",
  timezone: string,
  intent: AgentIntent,
  params: Record<string, unknown>,
): Promise<ChatWorkflowResult> {
  const enriched = await enrichAgentProposalDisplay(proposal, clubId, language, timezone);
  if (isCancelProposal(enriched) && !cancelProposalIsExecutable(enriched)) {
    return unresolvedCancelClarify(intent, params, language);
  }
  return { type: "proposal", proposal: enriched };
}

export async function processChatForAgentWorkflow(input: {
  clubId: string;
  message: string;
  language: "en" | "de";
  pageContext?: AgentPageContext;
  conversationId?: string | null;
  pendingWorkflow?: PendingWorkflowState | null;
  canUseAgent: boolean;
}): Promise<ChatWorkflowResult> {
  if (!input.canUseAgent) {
    return { type: "chat" };
  }

  const timezone = getBrowserTimezone();
  const pageContext = input.pageContext ?? { source: "co-trainer-chat" };

  if (input.pendingWorkflow) {
    const mergedParams = mergePendingAnswer(input.pendingWorkflow, input.message);
    try {
      const proposal = await proposeAgentRun({
        clubId: input.clubId,
        intent: input.pendingWorkflow.intent,
        params: mergedParams,
        language: input.language,
        pageContext,
        conversationId: input.conversationId ?? null,
        timezone,
      });
      return finalizeProposal(
        proposal,
        input.clubId,
        input.language,
        timezone,
        input.pendingWorkflow.intent,
        mergedParams,
      );
    } catch (e) {
      const clarify = extractAgentClarify(e);
      if (clarify) {
        return {
          type: "clarify",
          question: clarify.question,
          pending: {
            intent: clarify.intent,
            params: clarify.params,
            missingField: clarify.field,
          },
        };
      }
      const denied = extractAgentDenied(e);
      if (denied) return { type: "denied", body: denied };
      return { type: "error", message: e instanceof Error ? e.message : "Workflow failed" };
    }
  }

  let interpreted;
  try {
    interpreted = await interpretAgentFromMessage({
      clubId: input.clubId,
      message: input.message,
      language: input.language,
      pageContext,
      timezone,
    });
  } catch (e) {
    return { type: "error", message: e instanceof Error ? e.message : "Interpret failed" };
  }

  if (!interpreted) {
    return { type: "chat" };
  }

  if (interpreted.kind === "clarify") {
    const clarify = interpreted as AgentClarifyResponse;
    return {
      type: "clarify",
      question: clarify.question,
      pending: {
        intent: clarify.intent,
        params: clarify.params,
        missingField: clarify.field,
      },
    };
  }

  if (interpreted.kind === "team_access_denied") {
    return { type: "denied", body: interpreted };
  }

  if (interpreted.kind === "workflow") {
    try {
      const proposal = await proposeAgentRun({
        clubId: input.clubId,
        intent: interpreted.intent,
        params: interpreted.params,
        language: input.language,
        pageContext,
        conversationId: input.conversationId ?? null,
        timezone,
      });
      return finalizeProposal(
        proposal,
        input.clubId,
        input.language,
        timezone,
        interpreted.intent,
        interpreted.params,
      );
    } catch (e) {
      const clarify = extractAgentClarify(e);
      if (clarify) {
        return {
          type: "clarify",
          question: clarify.question,
          pending: {
            intent: clarify.intent,
            params: clarify.params,
            missingField: clarify.field,
          },
        };
      }
      const denied = extractAgentDenied(e);
      if (denied) return { type: "denied", body: denied };
      return { type: "error", message: e instanceof Error ? e.message : "Workflow failed" };
    }
  }

  return { type: "chat" };
}

export function formatTeamAccessDeniedMessage(
  body: AgentTeamAccessDeniedResponse,
  language: "en" | "de",
): string {
  const lines = [body.error];
  if (body.notify_suggestion) lines.push(body.notify_suggestion);
  const trainers = body.suggested_trainers ?? [];
  if (trainers.length > 0) {
    const names = trainers
      .map((t) => t.display_name?.trim())
      .filter(Boolean)
      .join(", ");
    if (names) {
      lines.push(
        language === "de" ? `Zuständige Trainer: ${names}` : `Assigned coaches: ${names}`,
      );
    }
  }
  return lines.join("\n\n");
}
