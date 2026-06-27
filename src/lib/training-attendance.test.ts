import { describe, expect, it } from "vitest";
import {
  buildRosterAttendanceLines,
  comingCount,
  isTrainingRsvpOpen,
  summarizeTrainingAttendance,
  TRAINING_RSVP_CUTOFF_MS,
} from "@/lib/training-attendance";

describe("training-attendance", () => {
  it("summarizes roster attendance counts", () => {
    const rows = [
      { id: "1", activity_id: "a", membership_id: "m1", status: "confirmed" as const, notes: null },
      { id: "2", activity_id: "a", membership_id: "m2", status: "declined" as const, notes: "injury" },
      { id: "3", activity_id: "a", membership_id: "m3", status: "invited" as const, notes: null },
    ];
    const summary = summarizeTrainingAttendance(rows);
    expect(summary.confirmed).toBe(1);
    expect(summary.declined).toBe(1);
    expect(summary.invited).toBe(1);
    expect(comingCount(summary)).toBe(1);
  });

  it("maps decline reasons from notes", () => {
    const lines = buildRosterAttendanceLines({
      roster: [{ membershipId: "m1", name: "Alex", role: "player", jerseyNumber: 9 }],
      attendanceByMember: {
        m1: { id: "1", activity_id: "a", membership_id: "m1", status: "declined", notes: "School trip" },
      },
    });
    expect(lines[0].declineReason).toBe("School trip");
  });

  it("closes training RSVP one hour before start", () => {
    const startsAt = new Date("2026-06-24T18:00:00.000Z").toISOString();
    const openAt = new Date("2026-06-24T16:59:59.000Z").getTime();
    const closedAt = new Date("2026-06-24T17:00:00.000Z").getTime();
    expect(isTrainingRsvpOpen(startsAt, openAt)).toBe(true);
    expect(isTrainingRsvpOpen(startsAt, closedAt)).toBe(false);
    expect(TRAINING_RSVP_CUTOFF_MS).toBe(3_600_000);
  });
});
