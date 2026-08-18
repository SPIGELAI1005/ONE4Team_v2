/**
 * Planned member availability / absences (independent of activity RSVP).
 * Overlap with an activity is contextual only — never silently overwrites RSVP.
 */

export type MemberAvailabilityStatus = "available" | "unavailable" | "limited";

export type MemberAvailabilityReason =
  | "illness"
  | "injury"
  | "holiday"
  | "school"
  | "family"
  | "work"
  | "other";

export interface MemberAvailabilityRow {
  id: string;
  club_id: string;
  membership_id: string;
  starts_at: string;
  ends_at: string;
  status: MemberAvailabilityStatus;
  reason: MemberAvailabilityReason | null;
  note: string | null;
}

export function rangesOverlap(
  aStartIso: string,
  aEndIso: string,
  bStartIso: string,
  bEndIso: string,
): boolean {
  const aStart = new Date(aStartIso).getTime();
  const aEnd = new Date(aEndIso).getTime();
  const bStart = new Date(bStartIso).getTime();
  const bEnd = new Date(bEndIso).getTime();
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}

/** Activity end falls back to start + 2h when ends_at is missing. */
export function activityWindow(input: {
  startsAt: string;
  endsAt?: string | null;
}): { startsAt: string; endsAt: string } {
  if (input.endsAt) return { startsAt: input.startsAt, endsAt: input.endsAt };
  const end = new Date(new Date(input.startsAt).getTime() + 2 * 60 * 60 * 1000);
  return { startsAt: input.startsAt, endsAt: end.toISOString() };
}

export function findOverlappingAvailability(input: {
  activityStartsAt: string;
  activityEndsAt?: string | null;
  rows: MemberAvailabilityRow[];
}): MemberAvailabilityRow[] {
  const window = activityWindow({
    startsAt: input.activityStartsAt,
    endsAt: input.activityEndsAt,
  });
  return input.rows.filter((row) =>
    rangesOverlap(window.startsAt, window.endsAt, row.starts_at, row.ends_at),
  );
}

/**
 * Suggest an RSVP from planned absence — never auto-apply.
 * unavailable/limited → suggest "declined"; available → suggest "confirmed".
 */
export function suggestedRsvpFromAvailability(
  overlaps: MemberAvailabilityRow[],
): "confirmed" | "declined" | "maybe" | null {
  if (!overlaps.length) return null;
  if (overlaps.some((r) => r.status === "unavailable")) return "declined";
  if (overlaps.some((r) => r.status === "limited")) return "maybe";
  if (overlaps.every((r) => r.status === "available")) return "confirmed";
  return null;
}

export function availabilityHintLabel(row: MemberAvailabilityRow): string {
  const parts = [row.status];
  if (row.reason) parts.push(row.reason);
  if (row.note?.trim()) parts.push(row.note.trim());
  return parts.join(" · ");
}
