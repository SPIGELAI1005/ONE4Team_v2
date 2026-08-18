import type { AgentIntent } from "./types";

export const AGENT_INTENT_TEMPLATES: { id: AgentIntent; schedule?: boolean; members?: boolean }[] = [
  { id: "create_training", schedule: true },
  { id: "cancel_training", schedule: true },
  { id: "cancel_training_with_parent_notice", schedule: true },
  { id: "plan_training_week", schedule: true },
  { id: "duplicate_training_week", schedule: true },
  { id: "notify_trainers", schedule: true },
  { id: "summarize_missing_rsvps", schedule: true },
  { id: "draft_attendance_reminder", schedule: true },
  { id: "propose_claimable_duty", schedule: true },
  { id: "propose_activity_checklist", schedule: true },
  { id: "summarize_attendance_metrics", schedule: true },
  { id: "draft_poll_question", schedule: true },
  { id: "add_member_draft", members: true },
];

export function intentRequiresAdmin(intent: AgentIntent): boolean {
  return intent === "add_member_draft";
}

export function intentRequiresTrainer(intent: AgentIntent): boolean {
  return intent !== "add_member_draft";
}
