import { describe, expect, it } from "vitest";
import {
  canAccessMembersModule,
  isFamilyMembersView,
  isStaffMembersRosterPersona,
  resolveFamilyMembershipIds,
} from "@/lib/guardian-family-scope";

describe("guardian-family-scope", () => {
  it("includes own membership before wards without duplicates", () => {
    expect(resolveFamilyMembershipIds("self-1", ["ward-a", "ward-b"])).toEqual([
      "self-1",
      "ward-a",
      "ward-b",
    ]);
  });

  it("returns only self when no wards are linked", () => {
    expect(resolveFamilyMembershipIds("self-1", [])).toEqual(["self-1"]);
  });

  it("detects staff roster personas", () => {
    expect(isStaffMembersRosterPersona("trainer")).toBe(true);
    expect(isStaffMembersRosterPersona("player")).toBe(false);
    expect(isStaffMembersRosterPersona("parent_supporter")).toBe(false);
  });

  it("uses family view for parent persona and player+guardian", () => {
    expect(
      isFamilyMembersView({
        membersDataScope: "family",
        hasGuardianWards: false,
        hasParentAssignment: false,
        canManageMembers: false,
        gateRole: "parent_supporter",
      }),
    ).toBe(true);
    expect(
      isFamilyMembersView({
        membersDataScope: "team",
        hasGuardianWards: true,
        hasParentAssignment: false,
        canManageMembers: false,
        gateRole: "player",
      }),
    ).toBe(true);
    expect(
      isFamilyMembersView({
        membersDataScope: "own",
        hasGuardianWards: false,
        hasParentAssignment: true,
        canManageMembers: false,
        gateRole: "player",
      }),
    ).toBe(true);
  });

  it("keeps team roster for trainer persona even with guardian links", () => {
    expect(
      isFamilyMembersView({
        membersDataScope: "team",
        hasGuardianWards: true,
        hasParentAssignment: true,
        canManageMembers: false,
        gateRole: "trainer",
      }),
    ).toBe(false);
  });

  it("grants members access for parent assignment without guardian links", () => {
    expect(
      canAccessMembersModule({
        gateRole: "player",
        hasGuardianWards: false,
        hasParentAssignment: true,
      }),
    ).toBe(true);
  });
});
