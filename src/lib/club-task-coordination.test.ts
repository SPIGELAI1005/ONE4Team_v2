import { describe, expect, it } from "vitest";
import {
  checklistProgress,
  dutySourceType,
  isClaimableDuty,
  slotsLabel,
} from "@/lib/club-task-coordination";

describe("club-task-coordination", () => {
  it("detects claimable single-slot duties", () => {
    expect(
      isClaimableDuty({
        claimable: true,
        status: "open",
        assignee_user_id: null,
        slots_total: null,
        slots_filled: 0,
      }),
    ).toBe(true);
    expect(
      isClaimableDuty({
        claimable: true,
        status: "open",
        assignee_user_id: "u1",
        slots_total: null,
        slots_filled: 1,
      }),
    ).toBe(false);
  });

  it("respects multi-slot capacity", () => {
    expect(
      isClaimableDuty({
        claimable: true,
        status: "in_progress",
        assignee_user_id: "u1",
        slots_total: 3,
        slots_filled: 2,
      }),
    ).toBe(true);
    expect(
      isClaimableDuty({
        claimable: true,
        status: "in_progress",
        assignee_user_id: "u1",
        slots_total: 3,
        slots_filled: 3,
      }),
    ).toBe(false);
  });

  it("summarizes checklist progress", () => {
    expect(checklistProgress([{ is_done: true }, { is_done: false }])).toEqual({
      done: 1,
      total: 2,
      complete: false,
    });
    expect(checklistProgress([{ is_done: true }, { is_done: true }]).complete).toBe(true);
  });

  it("maps duty source type and slot labels", () => {
    expect(dutySourceType(true)).toBe("duty");
    expect(dutySourceType(false)).toBe("manual");
    expect(slotsLabel({ slotsTotal: 4, slotsFilled: 1 })).toBe("1/4");
    expect(slotsLabel({ slotsTotal: null, slotsFilled: 0 })).toBeNull();
  });
});
