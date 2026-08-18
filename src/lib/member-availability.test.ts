import { describe, expect, it } from "vitest";
import {
  activityWindow,
  findOverlappingAvailability,
  rangesOverlap,
  suggestedRsvpFromAvailability,
} from "@/lib/member-availability";
import {
  findMissingAttendanceResponders,
  resolveAttendanceReminderBucket,
} from "@/lib/activity-attendance-missing";

describe("member-availability", () => {
  it("detects overlapping ranges", () => {
    expect(
      rangesOverlap(
        "2026-08-12T10:00:00.000Z",
        "2026-08-12T12:00:00.000Z",
        "2026-08-12T11:00:00.000Z",
        "2026-08-12T13:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        "2026-08-12T10:00:00.000Z",
        "2026-08-12T11:00:00.000Z",
        "2026-08-12T11:00:00.000Z",
        "2026-08-12T12:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("suggests declined RSVP from unavailable overlap without applying it", () => {
    const overlaps = findOverlappingAvailability({
      activityStartsAt: "2026-08-15T17:00:00.000Z",
      activityEndsAt: "2026-08-15T19:00:00.000Z",
      rows: [
        {
          id: "1",
          club_id: "c",
          membership_id: "m1",
          starts_at: "2026-08-14T00:00:00.000Z",
          ends_at: "2026-08-18T00:00:00.000Z",
          status: "unavailable",
          reason: "holiday",
          note: "Family trip",
        },
      ],
    });
    expect(overlaps).toHaveLength(1);
    expect(suggestedRsvpFromAvailability(overlaps)).toBe("declined");
  });

  it("defaults activity end to +2h", () => {
    const window = activityWindow({ startsAt: "2026-08-15T17:00:00.000Z" });
    expect(window.endsAt).toBe("2026-08-15T19:00:00.000Z");
  });
});

describe("activity-attendance-missing", () => {
  it("returns eligible people without a valid response", () => {
    const missing = findMissingAttendanceResponders({
      eligible: [
        { membershipId: "m1", name: "Alex" },
        { membershipId: "m2", name: "Sam" },
        { membershipId: "m3", name: "Kim" },
      ],
      attendanceRows: [
        { id: "1", activity_id: "a", membership_id: "m1", status: "confirmed", notes: null },
        { id: "2", activity_id: "a", membership_id: "m2", status: "invited", notes: null },
      ],
    });
    expect(missing.map((m) => m.membershipId).sort()).toEqual(["m2", "m3"]);
  });

  it("maps deadline proximity to reminder buckets", () => {
    const now = new Date("2026-08-10T12:00:00.000Z").getTime();
    expect(
      resolveAttendanceReminderBucket({
        responseDeadline: "2026-08-10T20:00:00.000Z",
        nowMs: now,
      }),
    ).toBe("deadline_24h");
    expect(
      resolveAttendanceReminderBucket({
        responseDeadline: "2026-08-12T00:00:00.000Z",
        nowMs: now,
      }),
    ).toBe("deadline_48h");
    expect(resolveAttendanceReminderBucket({ responseDeadline: null, nowMs: now })).toBeNull();
  });
});
