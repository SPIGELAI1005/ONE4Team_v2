import type { AgentIntent } from "./types";

export const AGENT_INTENT_TEMPLATES: { id: AgentIntent; schedule?: boolean; members?: boolean }[] = [
  { id: "create_training", schedule: true },
  { id: "cancel_training", schedule: true },
  { id: "plan_training_week", schedule: true },
  { id: "notify_trainers", schedule: true },
  { id: "add_member_draft", members: true },
];

export function intentRequiresAdmin(intent: AgentIntent): boolean {
  return intent === "add_member_draft";
}

export function intentRequiresTrainer(intent: AgentIntent): boolean {
  return intent !== "add_member_draft";
}
