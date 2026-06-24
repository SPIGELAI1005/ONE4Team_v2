export type TrainingAttendanceStatus = "invited" | "confirmed" | "declined" | "attended";

export interface TrainingAttendanceRow {
  id: string;
  activity_id: string;
  membership_id: string;
  status: TrainingAttendanceStatus;
  notes: string | null;
}

export interface TrainingAttendanceSummary {
  invited: number;
  confirmed: number;
  declined: number;
  attended: number;
  responded: number;
  total: number;
}

export function emptyTrainingAttendanceSummary(): TrainingAttendanceSummary {
  return { invited: 0, confirmed: 0, declined: 0, attended: 0, responded: 0, total: 0 };
}

export function summarizeTrainingAttendance(rows: TrainingAttendanceRow[]): TrainingAttendanceSummary {
  const summary = emptyTrainingAttendanceSummary();
  summary.total = rows.length;
  for (const row of rows) {
    if (row.status === "invited") summary.invited++;
    else if (row.status === "confirmed") summary.confirmed++;
    else if (row.status === "declined") summary.declined++;
    else if (row.status === "attended") summary.attended++;
    if (row.status === "confirmed" || row.status === "declined" || row.status === "attended") {
      summary.responded++;
    }
  }
  return summary;
}

export function comingCount(summary: TrainingAttendanceSummary): number {
  return summary.confirmed + summary.attended;
}

export interface RosterAttendanceLine {
  membershipId: string;
  name: string;
  role: string;
  jerseyNumber: number | null;
  status: TrainingAttendanceStatus;
  declineReason: string | null;
}

export function buildRosterAttendanceLines(input: {
  roster: { membershipId: string; name: string; role: string; jerseyNumber?: number | null }[];
  attendanceByMember: Record<string, TrainingAttendanceRow>;
}): RosterAttendanceLine[] {
  return input.roster
    .map((member) => {
      const row = input.attendanceByMember[member.membershipId];
      const status = row?.status ?? "invited";
      return {
        membershipId: member.membershipId,
        name: member.name,
        role: member.role,
        jerseyNumber: member.jerseyNumber ?? null,
        status,
        declineReason: status === "declined" ? row?.notes?.trim() || null : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
