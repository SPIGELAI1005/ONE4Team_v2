import { describe, expect, it } from "vitest";
import {
  buildSharedContactEmailGroups,
  isSharedContactEmail,
  memberRegistryIdentityKey,
} from "@/lib/member-shared-contact-email";
import {
  comparisonMissingToBulkImportRows,
  fieldGapPatchToMasterValue,
  isClubComparisonWorkbook,
  mergeFieldGapPatches,
} from "@/lib/club-comparison-workbook-import";

describe("member-shared-contact-email", () => {
  it("groups members by shared contact email", () => {
    const groups = buildSharedContactEmailGroups([
      { id: "1", email: "family@example.com", name: "Parent One", memberNumber: "100", source: "roster" },
      { id: "2", email: "family@example.com", name: "Child One", memberNumber: "101", source: "roster" },
      { id: "3", email: "solo@example.com", name: "Solo", memberNumber: "102", source: "roster" },
    ]);

    expect(groups.size).toBe(1);
    expect(isSharedContactEmail(groups, "family@example.com")).toBe(true);
    expect(isSharedContactEmail(groups, "solo@example.com")).toBe(false);
  });

  it("prefers club member number for identity keys", () => {
    expect(memberRegistryIdentityKey("a@b.com", "11281")).toBe("num:11281");
    expect(memberRegistryIdentityKey("a@b.com", "")).toBe("email:a@b.com");
    expect(memberRegistryIdentityKey("family@example.com", "", "Uli Fries")).toBe(
      "person:family@example.com:uli fries",
    );
  });
});

describe("club-comparison-workbook-import", () => {
  it("detects comparison workbook sheets", () => {
    expect(isClubComparisonWorkbook(["Summary", "Missing Members", "Field Gaps"])).toBe(true);
    expect(isClubComparisonWorkbook(["Registry"])).toBe(false);
  });

  it("maps missing members to import rows with club numbers", () => {
    const rows = comparisonMissingToBulkImportRows([
      {
        memberNumber: "11281",
        firstName: "Alexander",
        lastName: "Neacsu",
        email: "george.neacsu@gmx.de",
        clubStatus: "Aktiv",
        department: "Jugend",
        birthDate: "2014-05-04",
        sex: "male",
        city: "München",
        clubEntryDate: "2020-10-20",
        clubExitDate: "",
        possibleAccountLink: "Admin account exists",
        reason: "No matched ONE4Team member profile",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.masterData.internal_club_number).toBe("11281");
    expect(rows[0]?.role).toBe("player");
  });

  it("merges field gap patches by member number", () => {
    const merged = mergeFieldGapPatches([
      {
        memberNumber: "11645",
        firstName: "Karim",
        lastName: "Abdelrahman",
        one4teamField: "city",
        sourceValue: "Nürnberg",
        issue: "Missing in ONE4Team",
        recommendation: "Import the source value.",
      },
      {
        memberNumber: "11645",
        firstName: "Karim",
        lastName: "Abdelrahman",
        one4teamField: "postal_code",
        sourceValue: "90402",
        issue: "Missing in ONE4Team",
        recommendation: "Import the source value.",
      },
    ]);

    expect(merged.get("11645")).toEqual({ city: "Nürnberg", postal_code: "90402" });
    expect(fieldGapPatchToMasterValue("membership_kind", "active_participant")).toEqual({
      membership_kind: "active_participant",
    });
  });
});
