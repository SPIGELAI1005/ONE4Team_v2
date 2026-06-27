export type ClubTaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type ClubTaskPriority = "low" | "normal" | "high" | "urgent";
export type ClubTaskSourceType = "manual" | "ai_agent" | "event" | "partner";

export interface ClubTaskRow {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  status: ClubTaskStatus;
  priority: ClubTaskPriority;
  due_at: string | null;
  team_id: string | null;
  assignee_user_id: string | null;
  partner_id: string | null;
  source_type: ClubTaskSourceType;
  source_id: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubTaskAssigneeOption {
  user_id: string;
  label: string;
  role: string;
}

export interface ClubTaskPartnerOption {
  id: string;
  name: string;
  partner_type: string | null;
}

export const CLUB_TASK_STATUSES: ClubTaskStatus[] = ["open", "in_progress", "done", "cancelled"];
export const CLUB_TASK_PRIORITIES: ClubTaskPriority[] = ["low", "normal", "high", "urgent"];

export function isClubTaskOpen(status: ClubTaskStatus): boolean {
  return status === "open" || status === "in_progress";
}

export function isClubTaskOverdue(task: Pick<ClubTaskRow, "due_at" | "status">, now = Date.now()): boolean {
  if (!task.due_at || !isClubTaskOpen(task.status)) return false;
  return new Date(task.due_at).getTime() < now;
}

export function clubTaskStatusOnComplete(status: ClubTaskStatus): Pick<ClubTaskRow, "status" | "completed_at"> {
  if (status === "done") {
    return { status: "done", completed_at: new Date().toISOString() };
  }
  return { status, completed_at: null };
}
