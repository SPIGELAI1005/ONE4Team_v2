import { describe, expect, it } from "vitest";
import {
  canMemberClaimDue,
  collectMembershipIdsForDuesView,
  formatDueAmount,
  mapOpenDuesWithClaims,
  type OpenDueRow,
} from "@/lib/my-dues";

describe("my-dues helpers", () => {
  it("includes ward membership ids for parents", () => {
    expect(
      collectMembershipIdsForDuesView({
        membershipId: "m1",
        role: "parent_supporter",
        wardMembershipIds: ["w1", "w2"],
      }),
    ).toEqual(["m1", "w1", "w2"]);
  });

  it("maps pending claims and ward labels", () => {
    const dues: OpenDueRow[] = [
      {
        id: "d1",
        membershipId: "w1",
        dueDate: "2026-08-01",
        amountCents: 5000,
        currency: "EUR",
        status: "due",
        note: null,
      },
    ];
    const mapped = mapOpenDuesWithClaims(dues, new Set(["d1"]), new Map([["w1", "Jamie"]]));
    expect(mapped[0]?.wardLabel).toBe("Jamie");
    expect(mapped[0]?.pendingClaim).toBe(true);
    expect(canMemberClaimDue(mapped[0]!)).toBe(false);
  });

  it("formats due amounts", () => {
    expect(formatDueAmount(9900, "EUR", "en")).toContain("99");
    expect(formatDueAmount(null, "EUR", "de")).toBe("Offen");
  });
});
