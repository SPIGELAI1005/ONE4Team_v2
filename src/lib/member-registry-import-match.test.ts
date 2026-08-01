import { describe, expect, it } from "vitest";
import {
  registryImportNamesCompatible,
  resolveRegistryImportMatch,
} from "@/lib/member-registry-import-match";

describe("resolveRegistryImportMatch", () => {
  const membershipByClubNumber = new Map([["11053", "mem-uli"]]);
  const emailToMembership = new Map([["uli-fries@gmx.de", "mem-jacob"]]);
  const draftByClubNumber = new Map([["11053", { id: "draft-uli", name: "Uli Fries" }]]);
  const emailToDraft = new Map([["uli-fries@gmx.de", { id: "draft-jacob", name: "Jacob Fries" }]]);

  it("prefers club number over shared contact email for roster", () => {
    const result = resolveRegistryImportMatch({
      clubNumber: "11053",
      email: "uli-fries@gmx.de",
      membershipByClubNumber,
      emailToMembership,
      draftByClubNumber,
      emailToDraft,
    });
    expect(result).toEqual({
      membershipId: "mem-uli",
      draftId: null,
      draftName: null,
      matchKind: "club_number_roster",
    });
  });

  it("does not match roster by email when club number is absent on file row", () => {
    const result = resolveRegistryImportMatch({
      clubNumber: "",
      email: "uli-fries@gmx.de",
      membershipByClubNumber,
      emailToMembership,
      draftByClubNumber,
      emailToDraft,
    });
    expect(result.matchKind).toBe("email_roster");
    expect(result.membershipId).toBe("mem-jacob");
  });

  it("matches draft by club number when roster has no member number", () => {
    const result = resolveRegistryImportMatch({
      clubNumber: "11053",
      email: "uli-fries@gmx.de",
      membershipByClubNumber: new Map(),
      emailToMembership,
      draftByClubNumber,
      emailToDraft,
    });
    expect(result).toEqual({
      membershipId: null,
      draftId: "draft-uli",
      draftName: "Uli Fries",
      matchKind: "club_number_draft",
    });
  });

  it("returns none when club number matches roster but names differ (Uli vs Jacob)", () => {
    const result = resolveRegistryImportMatch({
      clubNumber: "11053",
      email: "uli-fries@gmx.de",
      importFirstName: "Uli",
      importLastName: "Fries",
      membershipByClubNumber: new Map([["11053", "mem-jacob"]]),
      emailToMembership,
      draftByClubNumber,
      emailToDraft,
      rosterMasterByMembershipId: new Map([
        ["mem-jacob", { firstName: "Jacob", lastName: "Fries", displayName: "Jacob Fries" }],
      ]),
    });
    expect(result.matchKind).toBe("none");
    expect(result.rejectedNameMismatch).toBe(true);
  });

  it("registryImportNamesCompatible rejects different first names with same surname", () => {
    expect(
      registryImportNamesCompatible("Uli", "Fries", {
        firstName: "Jacob",
        lastName: "Fries",
        displayName: "Jacob Fries",
      }),
    ).toBe(false);
  });

  it("returns none when club number is unknown and roster is empty", () => {
    const result = resolveRegistryImportMatch({
      clubNumber: "99999",
      email: "uli-fries@gmx.de",
      membershipByClubNumber: new Map(),
      emailToMembership: new Map(),
      draftByClubNumber: new Map(),
      emailToDraft: new Map(),
    });
    expect(result.matchKind).toBe("none");
    expect(result.membershipId).toBeNull();
    expect(result.draftId).toBeNull();
  });
});
