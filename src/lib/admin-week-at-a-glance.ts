import { supabase } from "@/integrations/supabase/client";
import { isClubTaskOpen } from "@/lib/club-task-models";

export interface AdminWeekAtAGlance {
  unpaidDues: number;
  overdueDues: number;
  pendingJoinRequests: number;
  rsvpGapActivities: number;
  rsvpPendingResponses: number;
  overdueTasks: number;
}

export const EMPTY_WEEK_AT_A_GLANCE: AdminWeekAtAGlance = {
  unpaidDues: 0,
  overdueDues: 0,
  pendingJoinRequests: 0,
  rsvpGapActivities: 0,
  rsvpPendingResponses: 0,
  overdueTasks: 0,
};

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("Could not find the table") || /\brelation\b.*\bdoes not exist\b/i.test(message);
}

/** Count open tasks past due_at (admin club-wide). */
export function countOverdueTasks(
  tasks: { due_at: string | null; status: string }[],
  nowMs = Date.now(),
): number {
  return tasks.filter((task) => {
    if (!task.due_at || !isClubTaskOpen(task.status as "open" | "in_progress" | "done" | "cancelled")) {
      return false;
    }
    return new Date(task.due_at).getTime() < nowMs;
  }).length;
}

/** Activities with at least one invited/no-response RSVP in the next window. */
export function summarizeRsvpGaps(
  attendanceRows: { activity_id: string; status: string }[],
): { gapActivities: number; pendingResponses: number } {
  const byActivity = new Map<string, number>();
  for (const row of attendanceRows) {
    if (row.status !== "invited") continue;
    byActivity.set(row.activity_id, (byActivity.get(row.activity_id) ?? 0) + 1);
  }
  let pendingResponses = 0;
  for (const count of byActivity.values()) pendingResponses += count;
  return { gapActivities: byActivity.size, pendingResponses };
}

export async function fetchAdminWeekAtAGlance(clubId: string): Promise<AdminWeekAtAGlance> {
  const now = new Date();
  const nowIso = now.toISOString();
  const in7Iso = new Date(now.getTime() + 7 * 86400000).toISOString();
  const today = nowIso.slice(0, 10);

  const [duesRes, overdueDuesRes, joinRes, tasksRes, actRes] = await Promise.all([
    supabase
      .from("membership_dues")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "due"),
    supabase
      .from("membership_dues")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "due")
      .lt("due_date", today),
    supabase
      .from("club_invite_requests")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
    supabase
      .from("club_tasks")
      .select("id, due_at, status")
      .eq("club_id", clubId)
      .in("status", ["open", "in_progress"])
      .limit(500),
    supabase
      .from("activities")
      .select("id")
      .eq("club_id", clubId)
      .ilike("type", "training")
      .gte("starts_at", nowIso)
      .lte("starts_at", in7Iso)
      .limit(100),
  ]);

  const unpaidDues = duesRes.error && isMissingRelationError(duesRes.error) ? 0 : duesRes.count ?? 0;
  const overdueDues =
    overdueDuesRes.error && isMissingRelationError(overdueDuesRes.error) ? 0 : overdueDuesRes.count ?? 0;
  const pendingJoinRequests =
    joinRes.error && isMissingRelationError(joinRes.error) ? 0 : joinRes.count ?? 0;
  const overdueTasks = tasksRes.error
    ? 0
    : countOverdueTasks((tasksRes.data ?? []) as { due_at: string | null; status: string }[]);

  const activityIds = (actRes.data ?? []).map((a) => a.id as string);
  let rsvpGapActivities = 0;
  let rsvpPendingResponses = 0;
  if (activityIds.length > 0) {
    const { data: attendance, error: attErr } = await supabase
      .from("activity_attendance")
      .select("activity_id, status")
      .eq("club_id", clubId)
      .in("activity_id", activityIds);
    if (!attErr && attendance) {
      const summary = summarizeRsvpGaps(attendance as { activity_id: string; status: string }[]);
      rsvpGapActivities = summary.gapActivities;
      rsvpPendingResponses = summary.pendingResponses;
    }
  }

  return {
    unpaidDues,
    overdueDues,
    pendingJoinRequests,
    rsvpGapActivities,
    rsvpPendingResponses,
    overdueTasks,
  };
}
