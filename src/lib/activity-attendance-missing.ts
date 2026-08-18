import type { TrainingAttendanceRow, TrainingAttendanceStatus } from "@/lib/training-attendance";
import { isAttendanceResponded } from "@/lib/training-attendance";

export interface EligibleAttendanceParticipant {
  membershipId: string;
  name: string;
  userId?: string | null;
}

export interface MissingAttendanceResponder extends EligibleAttendanceParticipant {
  status: TrainingAttendanceStatus | "none";
}

/**
 * eligible participants minus valid responses = missing responders.
 * Treat confirmed / declined / attended / maybe as answered.
 */
export function findMissingAttendanceResponders(input: {
  eligible: EligibleAttendanceParticipant[];
  attendanceRows: TrainingAttendanceRow[];
}): MissingAttendanceResponder[] {
  const byMember = new Map(input.attendanceRows.map((row) => [row.membership_id, row]));
  const missing: MissingAttendanceResponder[] = [];

  for (const person of input.eligible) {
    const row = byMember.get(person.membershipId);
    const status = row?.status ?? "none";
    if (status !== "none" && isAttendanceResponded(status)) continue;
    missing.push({
      ...person,
      status: status === "none" ? "invited" : status,
    });
  }

  return missing;
}

/** Deadline reminder buckets used by scheduled jobs (domain only). */
export type AttendanceReminderBucket = "deadline_48h" | "deadline_24h" | "manual_missing";

export function resolveAttendanceReminderBucket(input: {
  responseDeadline: string | null | undefined;
  nowMs?: number;
}): AttendanceReminderBucket | null {
  if (!input.responseDeadline) return null;
  const now = input.nowMs ?? Date.now();
  const deadline = new Date(input.responseDeadline).getTime();
  if (!Number.isFinite(deadline) || deadline <= now) return null;
  const hoursLeft = (deadline - now) / (60 * 60 * 1000);
  if (hoursLeft <= 24) return "deadline_24h";
  if (hoursLeft <= 48) return "deadline_48h";
  return null;
}
