import { describe, expect, it } from "vitest";
import {
  buildRosterAttendanceLines,
  comingCount,
  isActivityRsvpOpen,
  isTrainingRsvpOpen,
  responseReasonFromPresetId,
  summarizeTrainingAttendance,
  TRAINING_RSVP_CUTOFF_MS,
} from "@/lib/training-attendance";

describe("training-attendance", () => {
  it("summarizes roster attendance counts including maybe and unanswered", () => {
    const rows = [
      { id: "1", activity_id: "a", membership_id: "m1", status: "confirmed" as const, notes: null },
      { id: "2", activity_id: "a", membership_id: "m2", status: "declined" as const, notes: "injury" },
      { id: "3", activity_id: "a", membership_id: "m3", status: "invited" as const, notes: null },
      { id: "4", activity_id: "a", membership_id: "m4", status: "maybe" as const, notes: null },
    ];
    const summary = summarizeTrainingAttendance(rows);
    expect(summary.confirmed).toBe(1);
    expect(summary.declined).toBe(1);
    expect(summary.invited).toBe(1);
    expect(summary.maybe).toBe(1);
    expect(summary.unanswered).toBe(1);
    expect(summary.responded).toBe(3);
    expect(comingCount(summary)).toBe(1);
  });

  it("maps decline reasons from notes and response_reason", () => {
    const lines = buildRosterAttendanceLines({
      roster: [{ membershipId: "m1", name: "Alex", role: "player", jerseyNumber: 9 }],
      attendanceByMember: {
        m1: {
          id: "1",
          activity_id: "a",
          membership_id: "m1",
          status: "declined",
          notes: "School trip",
          response_reason: "school",
          responded_by: "user-1",
        },
      },
    });
    expect(lines[0].declineReason).toBe("School trip");
    expect(lines[0].responseReason).toBe("school");
    expect(lines[0].respondedBy).toBe("user-1");
  });

  it("closes training RSVP one hour before start", () => {
    const startsAt = new Date("2026-06-24T18:00:00.000Z").toISOString();
    const openAt = new Date("2026-06-24T16:59:59.000Z").getTime();
    const closedAt = new Date("2026-06-24T17:00:00.000Z").getTime();
    expect(isTrainingRsvpOpen(startsAt, openAt)).toBe(true);
    expect(isTrainingRsvpOpen(startsAt, closedAt)).toBe(false);
    expect(TRAINING_RSVP_CUTOFF_MS).toBe(3_600_000);
  });

  it("prefers explicit response_deadline over training default", () => {
    const startsAt = new Date("2026-06-24T18:00:00.000Z").toISOString();
    const deadline = new Date("2026-06-24T12:00:00.000Z").toISOString();
    expect(
      isActivityRsvpOpen({
        type: "training",
        startsAt,
        responseDeadline: deadline,
        nowMs: new Date("2026-06-24T11:00:00.000Z").getTime(),
      }),
    ).toBe(true);
    expect(
      isActivityRsvpOpen({
        type: "training",
        startsAt,
        responseDeadline: deadline,
        nowMs: new Date("2026-06-24T12:00:00.000Z").getTime(),
      }),
    ).toBe(false);
  });

  it("maps decline presets to typed reasons", () => {
    expect(responseReasonFromPresetId("illness")).toBe("illness");
    expect(responseReasonFromPresetId("vacation")).toBe("holiday");
    expect(responseReasonFromPresetId("custom")).toBe("other");
    expect(responseReasonFromPresetId(null)).toBeNull();
  });
});
