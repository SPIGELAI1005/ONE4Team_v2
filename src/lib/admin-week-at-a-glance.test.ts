import { describe, expect, it } from "vitest";
import { countOverdueTasks, summarizeRsvpGaps } from "@/lib/admin-week-at-a-glance";

describe("countOverdueTasks", () => {
  it("counts open tasks past due", () => {
    const now = Date.parse("2026-07-16T12:00:00Z");
    expect(
      countOverdueTasks(
        [
          { due_at: "2026-07-15T10:00:00Z", status: "open" },
          { due_at: "2026-07-17T10:00:00Z", status: "open" },
          { due_at: "2026-07-10T10:00:00Z", status: "done" },
          { due_at: null, status: "in_progress" },
        ],
        now,
      ),
    ).toBe(1);
  });
});

describe("summarizeRsvpGaps", () => {
  it("counts activities with invited rows", () => {
    expect(
      summarizeRsvpGaps([
        { activity_id: "a1", status: "invited" },
        { activity_id: "a1", status: "confirmed" },
        { activity_id: "a2", status: "invited" },
        { activity_id: "a2", status: "invited" },
        { activity_id: "a3", status: "declined" },
      ]),
    ).toEqual({ gapActivities: 2, pendingResponses: 3 });
  });
});
