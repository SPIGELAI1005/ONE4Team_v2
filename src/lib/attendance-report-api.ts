import { supabase } from "@/integrations/supabase/client";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  aggregateAttendanceWindow,
  type AttendanceMetricActivity,
  type AttendanceMetricRow,
  type AttendanceWindowAggregate,
  type EligibleByActivity,
} from "@/lib/attendance-report-metrics";
import { buildActivityRoster } from "@/lib/training-attendance";

const ACTIVITY_ROSTER_FETCH_CAP = 800;

export async function loadAttendanceReportWindow(input: {
  clubId: string;
  fromIso: string;
  toIso: string;
  teamId?: string | null;
}): Promise<{ data: AttendanceWindowAggregate | null; error: Error | null }> {
  let actsQuery = supabase
    .from("activities")
    .select("id, type, starts_at, ends_at, team_id")
    .eq("club_id", input.clubId)
    .in("type", ["training", "match"])
    .gte("starts_at", input.fromIso)
    .lt("starts_at", input.toIso)
    .order("starts_at", { ascending: true })
    .limit(100);

  if (input.teamId && input.teamId !== "all") {
    actsQuery = actsQuery.eq("team_id", input.teamId);
  }

  const [{ data: acts, error: actsErr }, { data: ms, error: msErr }] = await Promise.all([
    actsQuery,
    supabase
      .from("club_memberships")
      .select("id, role, status")
      .eq("club_id", input.clubId)
      .eq("status", "active")
      .limit(ACTIVITY_ROSTER_FETCH_CAP),
  ]);

  if (actsErr) return { data: null, error: new Error(actsErr.message) };
  if (msErr) return { data: null, error: new Error(msErr.message) };

  const activities = (acts ?? []) as Array<{
    id: string;
    type: string;
    starts_at: string;
    team_id: string | null;
  }>;
  const actIds = activities.map((a) => a.id);
  const activityTeamIds = [
    ...new Set(activities.map((activity) => activity.team_id).filter((teamId): teamId is string => Boolean(teamId))),
  ];
  let teamPlayers: Array<{
    team_id: string;
    membership_id: string;
    jersey_number: number | null;
  }> = [];
  if (activityTeamIds.length > 0) {
    const { data: tp, error: tpErr } = await supabase
      .from("team_players")
      .select("team_id, membership_id, jersey_number")
      .in("team_id", activityTeamIds);
    if (tpErr) return { data: null, error: new Error(tpErr.message) };
    teamPlayers = (tp ?? []) as typeof teamPlayers;
  }

  let rows: AttendanceMetricRow[] = [];
  if (actIds.length) {
    const attRes = await supabaseDynamic
      .from("activity_attendance")
      .select("activity_id, membership_id, status")
      .eq("club_id", input.clubId)
      .in("activity_id", actIds);
    const attErr = (attRes as { error?: { message?: string } | null }).error;
    if (attErr) return { data: null, error: new Error(attErr.message || "attendance_failed") };
    rows = ((attRes as { data?: AttendanceMetricRow[] }).data ?? []) as AttendanceMetricRow[];
  }

  const memberships = ((ms ?? []) as Array<{ id: string; role: string; status: string }>).map((m) => ({
    id: m.id,
    role: m.role,
    status: m.status,
    displayName: m.id.slice(0, 8),
  }));
  const eligibleByActivity: EligibleByActivity = {};
  const metricActivities: AttendanceMetricActivity[] = [];

  for (const activity of activities) {
    const roster = buildActivityRoster({
      teamId: activity.team_id,
      memberships,
      teamPlayers,
    });
    eligibleByActivity[activity.id] = roster.map((r) => r.membershipId);
    metricActivities.push({
      id: activity.id,
      teamId: activity.team_id,
      startsAt: activity.starts_at,
      type: activity.type,
    });
  }

  return {
    data: aggregateAttendanceWindow({
      activities: metricActivities,
      eligibleByActivity,
      rows,
      teamId: input.teamId,
    }),
    error: null,
  };
}
