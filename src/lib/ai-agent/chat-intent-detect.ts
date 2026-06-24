import type { AgentIntent } from "./types";

export interface ChatWorkflowCommand {
  intent: AgentIntent;
  params: Record<string, unknown>;
}

/** Slash commands in Chat tab, e.g. `/agent notify`. Opens Agent tab when params need a form. */
export function parseChatAgentCommand(message: string): ChatWorkflowCommand | "open_agent" | null {
  const trimmed = message.trim();
  if (!trimmed.toLowerCase().startsWith("/agent")) return null;

  const rest = trimmed.slice("/agent".length).trim().toLowerCase();
  if (!rest || rest === "help") return "open_agent";

  if (rest === "plan-week" || rest === "plan week") {
    return { intent: "plan_training_week", params: {} };
  }
  if (rest === "notify" || rest === "notify-trainers") {
    return { intent: "notify_trainers", params: {} };
  }
  if (rest === "add-member" || rest === "member") {
    return { intent: "add_member_draft", params: {} };
  }
  if (rest === "create-training" || rest === "training") {
    return { intent: "create_training", params: {} };
  }

  if (rest === "cancel-training" || rest === "cancel") {
    return { intent: "cancel_training", params: {} };
  }
  if (rest === "cancel-notify" || rest === "cancel-parents") {
    return { intent: "cancel_training_with_parent_notice", params: {} };
  }
  if (rest === "duplicate-week" || rest === "duplicate week") {
    return { intent: "duplicate_training_week", params: {} };
  }

  return "open_agent";
}

export function chatCommandNeedsAgentForm(result: ChatWorkflowCommand | "open_agent"): boolean {
  if (result === "open_agent") return true;
  return (
    result.intent === "plan_training_week" ||
    result.intent === "notify_trainers" ||
    result.intent === "add_member_draft" ||
    result.intent === "create_training" ||
    result.intent === "cancel_training" ||
    result.intent === "cancel_training_with_parent_notice" ||
    result.intent === "duplicate_training_week"
  );
}
