import { describe, expect, it } from "vitest";
import {
  aggregateAttendanceWindow,
  computeActivityAttendanceRates,
  formatPercent,
} from "@/lib/attendance-report-metrics";

describe("attendance-report-metrics", () => {
  it("computes response and coming rates per activity", () => {
    const rates = computeActivityAttendanceRates({
      activityId: "a1",
      eligibleMembershipIds: ["m1", "m2", "m3", "m4"],
      rows: [
        { activity_id: "a1", membership_id: "m1", status: "confirmed" },
        { activity_id: "a1", membership_id: "m2", status: "declined" },
        { activity_id: "a1", membership_id: "m3", status: "maybe" },
        { activity_id: "a1", membership_id: "m4", status: "invited" },
      ],
    });
    expect(rates.respondedCount).toBe(3);
    expect(rates.comingCount).toBe(1);
    expect(rates.missingCount).toBe(1);
    expect(rates.responseRate).toBe(0.75);
    expect(rates.comingRate).toBe(0.25);
  });

  it("aggregates a window and formats percent", () => {
    const agg = aggregateAttendanceWindow({
      activities: [
        { id: "a1", teamId: "t1", startsAt: "2026-08-01T10:00:00Z", type: "training" },
        { id: "a2", teamId: "t1", startsAt: "2026-08-02T10:00:00Z", type: "match" },
      ],
      eligibleByActivity: {
        a1: ["m1", "m2"],
        a2: ["m1", "m2"],
      },
      rows: [
        { activity_id: "a1", membership_id: "m1", status: "confirmed" },
        { activity_id: "a1", membership_id: "m2", status: "confirmed" },
        { activity_id: "a2", membership_id: "m1", status: "declined" },
      ],
    });
    expect(agg.activitiesInWindow).toBe(2);
    expect(agg.avgResponseRate).toBe(0.75);
    expect(agg.rsvpGapActivities).toBe(1);
    expect(formatPercent(0.75)).toBe("75%");
    expect(formatPercent(null)).toBe("—");
  });
});
