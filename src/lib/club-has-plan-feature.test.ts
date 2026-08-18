import { describe, expect, it } from "vitest";

/**
 * Mirrors Prompt 17 / SQL `club_has_plan_feature` tiers for client docs & tests.
 * Server enforcement lives in migration `20260812260000`.
 */
function clubHasPlanFeature(planId: string | null | undefined, feature: string): boolean {
  const plan = (planId ?? "").toLowerCase();
  if (!plan) return false;
  const paid = ["kickoff", "squad", "pro", "champions", "bespoke"];
  const proPlus = ["pro", "champions", "bespoke"];
  if (feature === "polls" || feature === "calendarIcs") return paid.includes(plan);
  if (feature === "teamCashbox" || feature === "carpoolGuests") return proPlus.includes(plan);
  return false;
}

describe("club_has_plan_feature (Prompt 17 mirror)", () => {
  it("gives polls and ICS to Kick-off+", () => {
    expect(clubHasPlanFeature("kickoff", "polls")).toBe(true);
    expect(clubHasPlanFeature("squad", "calendarIcs")).toBe(true);
    expect(clubHasPlanFeature("kickoff", "teamCashbox")).toBe(false);
  });

  it("gates cashbox and carpool to Pro+", () => {
    expect(clubHasPlanFeature("pro", "teamCashbox")).toBe(true);
    expect(clubHasPlanFeature("pro", "carpoolGuests")).toBe(true);
    expect(clubHasPlanFeature("squad", "carpoolGuests")).toBe(false);
  });
});
