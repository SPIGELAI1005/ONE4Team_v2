import { describe, expect, it } from "vitest";
import { ageYearsFromBirthDate, isPlayerLikeRoleForGuardianLink, isUnder18 } from "@/lib/under-18";

describe("under-18 helpers", () => {
  it("computes age from birth date", () => {
    expect(ageYearsFromBirthDate("2010-01-01", new Date("2026-07-18"))).toBe(16);
    expect(ageYearsFromBirthDate("2008-07-19", new Date("2026-07-18"))).toBe(17);
    expect(ageYearsFromBirthDate("2008-07-18", new Date("2026-07-18"))).toBe(18);
  });

  it("flags under-18 players", () => {
    expect(isUnder18("2012-05-01", new Date("2026-07-18"))).toBe(true);
    expect(isUnder18("2000-01-01", new Date("2026-07-18"))).toBe(false);
    expect(isUnder18(null)).toBe(false);
  });

  it("recognizes player-like roles for guardian linking", () => {
    expect(isPlayerLikeRoleForGuardianLink("player")).toBe(true);
    expect(isPlayerLikeRoleForGuardianLink("parent")).toBe(false);
  });
});
