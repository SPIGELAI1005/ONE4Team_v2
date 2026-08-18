import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { TrainingAttendanceStatus } from "@/lib/training-attendance";

/** Find a match-type activity on the same day/team for lineup ↔ RSVP bridge. */
export async function findActivityForMatch(input: {
  clubId: string;
  teamId: string | null;
  matchDateIso: string;
}): Promise<{ activityId: string | null; error: Error | null }> {
  const dayStart = new Date(input.matchDateIso);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let query = supabaseDynamic
    .from("activities")
    .select("id")
    .eq("club_id", input.clubId)
    .eq("type", "match")
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .limit(1);

  if (input.teamId) {
    query = query.eq("team_id", input.teamId);
  }

  const result = await query.maybeSingle();
  const error = (result as { error?: { message?: string } | null }).error;
  if (error) return { activityId: null, error: new Error(error.message || "load_failed") };
  const data = (result as { data?: { id: string } | null }).data;
  return { activityId: data?.id ?? null, error: null };
}

export async function fetchAttendanceStatusByMembership(input: {
  clubId: string;
  activityId: string;
  membershipIds: string[];
}): Promise<{ data: Record<string, TrainingAttendanceStatus>; error: Error | null }> {
  if (!input.membershipIds.length) return { data: {}, error: null };

  const result = await supabaseDynamic
    .from("activity_attendance")
    .select("membership_id, status")
    .eq("club_id", input.clubId)
    .eq("activity_id", input.activityId)
    .in("membership_id", input.membershipIds);

  const error = (result as { error?: { message?: string } | null }).error;
  const rows = (result as { data?: Array<{ membership_id: string; status: TrainingAttendanceStatus }> }).data ?? [];
  if (error) return { data: {}, error: new Error(error.message || "load_failed") };

  const data: Record<string, TrainingAttendanceStatus> = {};
  for (const row of rows) data[row.membership_id] = row.status;
  return { data, error: null };
}

export function attendanceStatusLabel(
  status: TrainingAttendanceStatus | undefined,
  labels: { coming: string; declined: string; maybe: string; pending: string; attended: string; waitlisted: string },
): string | null {
  if (!status || status === "invited") return labels.pending;
  if (status === "confirmed") return labels.coming;
  if (status === "attended") return labels.attended;
  if (status === "declined") return labels.declined;
  if (status === "maybe") return labels.maybe;
  if (status === "waitlisted") return labels.waitlisted;
  return null;
}
