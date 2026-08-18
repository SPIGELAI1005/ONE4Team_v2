/**
 * Attendance report metrics — see docs/attendance-metric-definitions.md.
 */

import { isAttendanceResponded, type TrainingAttendanceStatus } from "@/lib/training-attendance";

export type AttendanceMetricActivity = {
  id: string;
  teamId: string | null;
  startsAt: string;
  type: string;
};

export type AttendanceMetricRow = {
  activity_id: string;
  membership_id: string;
  status: TrainingAttendanceStatus;
};

export type EligibleByActivity = Record<string, string[]>;

export type ActivityAttendanceRates = {
  activityId: string;
  eligibleCount: number;
  respondedCount: number;
  comingCount: number;
  declinedCount: number;
  maybeCount: number;
  missingCount: number;
  responseRate: number | null;
  comingRate: number | null;
};

export type AttendanceWindowAggregate = {
  activitiesInWindow: number;
  avgResponseRate: number | null;
  avgComingRate: number | null;
  totalMissing: number;
  rsvpGapActivities: number;
  activities: ActivityAttendanceRates[];
};

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

export function computeActivityAttendanceRates(input: {
  activityId: string;
  eligibleMembershipIds: string[];
  rows: AttendanceMetricRow[];
}): ActivityAttendanceRates {
  const eligible = new Set(input.eligibleMembershipIds);
  const eligibleCount = eligible.size;
  let respondedCount = 0;
  let comingCount = 0;
  let declinedCount = 0;
  let maybeCount = 0;

  for (const row of input.rows) {
    if (row.activity_id !== input.activityId) continue;
    if (!eligible.has(row.membership_id)) continue;
    if (!isAttendanceResponded(row.status)) continue;
    respondedCount += 1;
    if (row.status === "confirmed" || row.status === "attended") comingCount += 1;
    else if (row.status === "declined") declinedCount += 1;
    else if (row.status === "maybe") maybeCount += 1;
  }

  const missingCount = Math.max(0, eligibleCount - respondedCount);
  return {
    activityId: input.activityId,
    eligibleCount,
    respondedCount,
    comingCount,
    declinedCount,
    maybeCount,
    missingCount,
    responseRate: rate(respondedCount, eligibleCount),
    comingRate: rate(comingCount, eligibleCount),
  };
}

export function aggregateAttendanceWindow(input: {
  activities: AttendanceMetricActivity[];
  eligibleByActivity: EligibleByActivity;
  rows: AttendanceMetricRow[];
  teamId?: string | null;
}): AttendanceWindowAggregate {
  const scoped = input.activities.filter((activity) => {
    if (activity.type !== "training" && activity.type !== "match") return false;
    if (input.teamId && input.teamId !== "all" && activity.teamId !== input.teamId) return false;
    return true;
  });

  const activities = scoped.map((activity) =>
    computeActivityAttendanceRates({
      activityId: activity.id,
      eligibleMembershipIds: input.eligibleByActivity[activity.id] ?? [],
      rows: input.rows,
    }),
  );

  const responseRates = activities.map((a) => a.responseRate).filter((v): v is number => v != null);
  const comingRates = activities.map((a) => a.comingRate).filter((v): v is number => v != null);
  const avg = (values: number[]) =>
    values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 1000) / 1000 : null;

  return {
    activitiesInWindow: activities.length,
    avgResponseRate: avg(responseRates),
    avgComingRate: avg(comingRates),
    totalMissing: activities.reduce((s, a) => s + a.missingCount, 0),
    rsvpGapActivities: activities.filter((a) => a.missingCount > 0).length,
    activities,
  };
}

export function formatPercent(rateValue: number | null): string {
  if (rateValue == null) return "—";
  return `${Math.round(rateValue * 100)}%`;
}
