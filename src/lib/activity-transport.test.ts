import { describe, expect, it } from "vitest";
import { canRequestSeat, seatsRemaining } from "@/lib/activity-transport";

describe("activity-transport", () => {
  it("computes remaining seats", () => {
    expect(seatsRemaining({ seats_total: 4, seats_taken: 1, status: "open" })).toBe(3);
    expect(seatsRemaining({ seats_total: 4, seats_taken: 4, status: "full" })).toBe(0);
    expect(seatsRemaining({ seats_total: 4, seats_taken: 0, status: "cancelled" })).toBe(0);
  });

  it("blocks own offer and full rides", () => {
    expect(
      canRequestSeat(
        { status: "open", seats_total: 2, seats_taken: 0, driver_membership_id: "m1" },
        "m1",
      ),
    ).toBe(false);
    expect(
      canRequestSeat(
        { status: "open", seats_total: 2, seats_taken: 0, driver_membership_id: "m1" },
        "m2",
      ),
    ).toBe(true);
  });
});
