import {
  CalendarPlus,
  CalendarX,
  Megaphone,
  UserPlus,
  CalendarRange,
} from "lucide-react";
import type { AgentIntent } from "./types";

export interface AgentIntentMeta {
  id: AgentIntent;
  icon: typeof CalendarPlus;
}

export const AGENT_INTENT_META: Record<AgentIntent, AgentIntentMeta> = {
  create_training: { id: "create_training", icon: CalendarPlus },
  cancel_training: { id: "cancel_training", icon: CalendarX },
  cancel_training_with_parent_notice: { id: "cancel_training_with_parent_notice", icon: CalendarX },
  add_member_draft: { id: "add_member_draft", icon: UserPlus },
  send_club_announcement: { id: "send_club_announcement", icon: Megaphone },
  plan_training_week: { id: "plan_training_week", icon: CalendarRange },
  duplicate_training_week: { id: "duplicate_training_week", icon: CalendarRange },
  notify_trainers: { id: "notify_trainers", icon: Megaphone },
};

export function visibleIntentsForUser(options: {
  canManageSchedule: boolean;
  canManageMembers: boolean;
}): AgentIntent[] {
  const out: AgentIntent[] = [];
  if (options.canManageSchedule) {
    out.push(
      "create_training",
      "cancel_training",
      "cancel_training_with_parent_notice",
      "plan_training_week",
      "duplicate_training_week",
      "notify_trainers",
    );
  }
  if (options.canManageMembers) {
    out.push("add_member_draft");
  }
  return out;
}
