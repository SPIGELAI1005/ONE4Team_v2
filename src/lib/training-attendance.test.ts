import { describe, expect, it } from "vitest";
import {
  buildRosterAttendanceLines,
  comingCount,
  summarizeTrainingAttendance,
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
});
