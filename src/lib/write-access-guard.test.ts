import { describe, expect, it } from "vitest";
import { canMutateClubData, isGraceBlockedAction } from "@/lib/write-access-guard";
import { resolveEffectivePlan } from "@/lib/effective-plan";

describe("write-access-guard", () => {
  it("blocks grace and expired clubs", () => {
    const grace = resolveEffectivePlan({
      planId: "kickoff",
      status: "grace",
      commercialOfferActive: false,
      inGracePeriod: true,
    });
    expect(canMutateClubData(grace)).toBe(false);
    expect(isGraceBlockedAction(grace, "send_message")).toBe(true);
  });

  it("allows promotional founding clubs to mutate", () => {
    const promo = resolveEffectivePlan({
      planId: "kickoff",
      status: "promotional",
      commercialOfferActive: true,
      accessSource: "commercial_offer",
    });
    expect(canMutateClubData(promo)).toBe(true);
  });
});
