import { describe, expect, it } from "vitest";
import {
  ageYearsFromBirthDate,
  isPlayerLikeRoleForGuardianLink,
  isUnder18,
  isYouthAgeGroup,
  isGuardianEligibleWardRole,
  shouldShowGuardianSafetySection,
  shouldPersistDraftGuardianMembershipIds,
} from "@/lib/under-18";

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

  it("recognizes youth age groups", () => {
    expect(isYouthAgeGroup("U16")).toBe(true);
    expect(isYouthAgeGroup("U-12")).toBe(true);
    expect(isYouthAgeGroup("Senior")).toBe(false);
  });

  it("keeps guardian section visible after a link exists", () => {
    expect(
      shouldShowGuardianSafetySection({
        role: "member",
        wardLinksCount: 1,
        birthDate: null,
        ageGroup: "U16",
        canManageMembers: true,
      }),
    ).toBe(true);
  });

  it("shows guardian linking for youth members when admin manages roster", () => {
    expect(
      shouldShowGuardianSafetySection({
        role: "member",
        wardLinksCount: 0,
        birthDate: null,
        ageGroup: "U16",
        canManageMembers: true,
      }),
    ).toBe(true);
  });

  it("uses unsaved inline edit age group for youth guardian eligibility", () => {
    expect(
      shouldShowGuardianSafetySection({
        role: "member",
        wardLinksCount: 0,
        birthDate: null,
        ageGroup: "U16",
        canManageMembers: true,
      }),
    ).toBe(true);
    expect(
      shouldShowGuardianSafetySection({
        role: "member",
        wardLinksCount: 0,
        birthDate: null,
        ageGroup: null,
        canManageMembers: true,
      }),
    ).toBe(false);
  });

  it("keeps guardian links for youth member role on save eligibility", () => {
    expect(isGuardianEligibleWardRole("member", null, "U16")).toBe(true);
    expect(isGuardianEligibleWardRole("player", null, null)).toBe(true);
    expect(isGuardianEligibleWardRole("parent", null, null)).toBe(false);
  });

  it("persists draft guardian ids for player and youth profiles", () => {
    expect(
      shouldPersistDraftGuardianMembershipIds("player", { birth_date: null }, null),
    ).toBe(true);
    expect(
      shouldPersistDraftGuardianMembershipIds("member", { birth_date: null }, "Jugend"),
    ).toBe(true);
    expect(
      shouldPersistDraftGuardianMembershipIds("parent", { birth_date: null }, "Jugend"),
    ).toBe(false);
  });
});
