/**
 * Wave 3 task coordination helpers: claimable duties + checklist progress.
 */

import type { ClubTaskRow, ClubTaskSourceType } from "@/lib/club-task-models";

export type ClubTaskChecklistItem = {
  id: string;
  club_id: string;
  task_id: string;
  title: string;
  sort_order: number;
  is_done: boolean;
  done_by: string | null;
  done_at: string | null;
};

export function isClaimableDuty(
  task: Pick<ClubTaskRow, "claimable" | "status" | "assignee_user_id" | "slots_total" | "slots_filled">,
): boolean {
  if (!task.claimable) return false;
  if (task.status !== "open" && task.status !== "in_progress") return false;
  if (task.slots_total == null) return task.assignee_user_id == null;
  return (task.slots_filled ?? 0) < task.slots_total;
}

export function checklistProgress(items: Pick<ClubTaskChecklistItem, "is_done">[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const total = items.length;
  const done = items.filter((item) => item.is_done).length;
  return { done, total, complete: total > 0 && done === total };
}

export function dutySourceType(claimable: boolean): ClubTaskSourceType {
  return claimable ? "duty" : "manual";
}

export function slotsLabel(input: {
  slotsTotal: number | null | undefined;
  slotsFilled: number | null | undefined;
}): string | null {
  if (input.slotsTotal == null) return null;
  return `${input.slotsFilled ?? 0}/${input.slotsTotal}`;
}
