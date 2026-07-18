import { describe, expect, it } from "vitest";
import { bookingCoversSession, buildDayScheduleItems } from "@/lib/day-schedule-items";

describe("day-schedule-items", () => {
  const booking = {
    id: "b1",
    title: "U12 Training",
    starts_at: "2026-07-20T16:00:00.000Z",
    ends_at: "2026-07-20T17:30:00.000Z",
    pitch_id: "p1",
    team_id: "t1",
    booking_type: "training" as const,
    status: "booked",
    activity_id: "a1",
  };

  const session = {
    id: "a1",
    title: "U12 Training",
    starts_at: "2026-07-20T16:00:00.000Z",
    ends_at: "2026-07-20T17:30:00.000Z",
    location: "AF1",
    team_id: "t1",
  };

  it("detects bookings that already cover a training", () => {
    expect(bookingCoversSession(booking, session)).toBe(true);
    expect(bookingCoversSession({ ...booking, activity_id: null }, session)).toBe(true);
    expect(bookingCoversSession({ ...booking, activity_id: null, title: "Other" }, session)).toBe(false);
  });

  it("includes uncovered trainings alongside bookings", () => {
    const items = buildDayScheduleItems({
      bookings: [booking],
      sessions: [
        session,
        {
          id: "a2",
          title: "U13 Training",
          starts_at: "2026-07-20T18:00:00.000Z",
          ends_at: "2026-07-20T19:00:00.000Z",
          location: null,
          team_id: "t2",
        },
      ],
    });
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe("booking");
    expect(items[1].kind).toBe("training");
    expect(items[1].id).toBe("a2");
  });

  it("skips cancelled bookings", () => {
    const items = buildDayScheduleItems({
      bookings: [{ ...booking, status: "cancelled" }],
      sessions: [session],
    });
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("training");
  });
});
