export const TRAINING_RSVP_CUTOFF_MS = 60 * 60 * 1000;

/** Trainings accept RSVP changes until one hour before start (when no response_deadline). */
export function isTrainingRsvpOpen(startsAt: string, nowMs = Date.now()): boolean {
  return new Date(startsAt).getTime() - nowMs > TRAINING_RSVP_CUTOFF_MS;
}

/** Prefer activity.response_deadline when set; otherwise training default cutoff. */
export function isActivityRsvpOpen(input: {
  type: string;
  startsAt: string;
  responseDeadline?: string | null;
  nowMs?: number;
}): boolean {
  const nowMs = input.nowMs ?? Date.now();
  if (input.responseDeadline) {
    return new Date(input.responseDeadline).getTime() > nowMs;
  }
  if (input.type === "training") return isTrainingRsvpOpen(input.startsAt, nowMs);
  return true;
}

export type TrainingAttendanceStatus =
  | "invited"
  | "confirmed"
  | "declined"
  | "attended"
  | "maybe"
  | "waitlisted";

export type TrainingAttendanceResponseReason =
  | "illness"
  | "injury"
  | "holiday"
  | "school"
  | "family"
  | "work"
  | "other";

export interface TrainingAttendanceRow {
  id: string;
  activity_id: string;
  membership_id: string;
  status: TrainingAttendanceStatus;
  notes: string | null;
  response_reason?: TrainingAttendanceResponseReason | null;
  responded_by?: string | null;
  responded_at?: string | null;
}

export interface TrainingAttendanceSummary {
  invited: number;
  confirmed: number;
  declined: number;
  attended: number;
  maybe: number;
  unanswered: number;
  responded: number;
  total: number;
}

export function emptyTrainingAttendanceSummary(): TrainingAttendanceSummary {
  return {
    invited: 0,
    confirmed: 0,
    declined: 0,
    attended: 0,
    maybe: 0,
    unanswered: 0,
    responded: 0,
    total: 0,
  };
}

export function isAttendanceResponded(status: TrainingAttendanceStatus): boolean {
  return status === "confirmed" || status === "declined" || status === "attended" || status === "maybe";
}

export function isAttendanceComing(status: TrainingAttendanceStatus): boolean {
  return status === "confirmed" || status === "attended";
}

export function summarizeTrainingAttendance(rows: TrainingAttendanceRow[]): TrainingAttendanceSummary {
  const summary = emptyTrainingAttendanceSummary();
  summary.total = rows.length;
  for (const row of rows) {
    if (row.status === "invited") {
      summary.invited++;
      summary.unanswered++;
    } else if (row.status === "confirmed") summary.confirmed++;
    else if (row.status === "declined") summary.declined++;
    else if (row.status === "attended") summary.attended++;
    else if (row.status === "maybe") summary.maybe++;
    if (isAttendanceResponded(row.status)) summary.responded++;
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
  responseReason: TrainingAttendanceResponseReason | null;
  respondedBy: string | null;
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
        responseReason: status === "declined" ? row?.response_reason ?? null : null,
        respondedBy: row?.responded_by ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isMemberInvitedToActivity(
  membershipId: string,
  roster: RosterMember[],
  existingAttendance: TrainingAttendanceRow | null,
): boolean {
  if (existingAttendance) return true;
  return roster.some((member) => member.membershipId === membershipId);
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface RosterMember {
  membershipId: string;
  name: string;
  role: string;
  jerseyNumber: number | null;
}

export function buildActivityRoster(input: {
  teamId: string | null;
  memberships: { id: string; role: string; status: string; displayName: string }[];
  teamPlayers: { team_id: string; membership_id: string; jersey_number: number | null }[];
}): RosterMember[] {
  if (input.teamId) {
    const jerseyByMember = new Map(
      input.teamPlayers
        .filter((tp) => tp.team_id === input.teamId)
        .map((tp) => [tp.membership_id, tp.jersey_number]),
    );
    const memberIds = new Set(jerseyByMember.keys());
    return input.memberships
      .filter((m) => m.status === "active" && memberIds.has(m.id))
      .map((m) => ({
        membershipId: m.id,
        name: m.displayName || m.id.slice(0, 8),
        role: m.role,
        jerseyNumber: jerseyByMember.get(m.id) ?? null,
      }));
  }

  return input.memberships
    .filter((m) => m.status === "active" && (m.role === "player" || m.role === "member"))
    .map((m) => ({
      membershipId: m.id,
      name: m.displayName || m.id.slice(0, 8),
      role: m.role,
      jerseyNumber: null,
    }));
}

export interface ActivityAttendanceOverview {
  summary: TrainingAttendanceSummary;
  lines: RosterAttendanceLine[];
}

export function buildActivityAttendanceOverview(input: {
  roster: RosterMember[];
  attendanceRows: TrainingAttendanceRow[];
}): ActivityAttendanceOverview {
  const attendanceByMember: Record<string, TrainingAttendanceRow> = {};
  for (const row of input.attendanceRows) attendanceByMember[row.membership_id] = row;

  const lines = buildRosterAttendanceLines({ roster: input.roster, attendanceByMember });
  const summary = summarizeTrainingAttendance(
    lines.map((line) => ({
      id: attendanceByMember[line.membershipId]?.id ?? line.membershipId,
      activity_id: attendanceByMember[line.membershipId]?.activity_id ?? "",
      membership_id: line.membershipId,
      status: line.status,
      notes: attendanceByMember[line.membershipId]?.notes ?? null,
      response_reason: attendanceByMember[line.membershipId]?.response_reason ?? null,
      responded_by: attendanceByMember[line.membershipId]?.responded_by ?? null,
      responded_at: attendanceByMember[line.membershipId]?.responded_at ?? null,
    })),
  );

  return { summary, lines };
}

/** Map UI decline preset ids to typed response_reason values. */
export function responseReasonFromPresetId(presetId: string | null | undefined): TrainingAttendanceResponseReason | null {
  switch (presetId) {
    case "injury":
      return "injury";
    case "illness":
      return "illness";
    case "school":
      return "school";
    case "work":
      return "work";
    case "vacation":
    case "holiday":
      return "holiday";
    case "family":
      return "family";
    case "other":
      return "other";
    default:
      return presetId ? "other" : null;
  }
}
