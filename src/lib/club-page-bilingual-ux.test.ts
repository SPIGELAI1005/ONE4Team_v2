import { describe, expect, it } from "vitest";
import {
  copyPrimaryLocalizedFields,
  missingSecondaryRequiredFields,
} from "@/lib/club-page-bilingual-ux";
import { emptyClubLocalizedContent } from "@/lib/club-public-page-i18n";

describe("club-page-bilingual-ux", () => {
  it("finds missing secondary fields when primary is filled", () => {
    const primary = { ...emptyClubLocalizedContent(), description: "Hello", meta_title: "Title" };
    const secondary = emptyClubLocalizedContent();
    expect(missingSecondaryRequiredFields(primary, secondary, ["description", "meta_title"])).toEqual([
      "description",
      "meta_title",
    ]);
  });

  it("copies only empty secondary fields from primary", () => {
    const primary = { ...emptyClubLocalizedContent(), description: "EN", meta_title: "T" };
    const secondary = { ...emptyClubLocalizedContent(), description: "DE keep" };
    expect(copyPrimaryLocalizedFields(primary, secondary, ["description", "meta_title"])).toEqual({
      ...emptyClubLocalizedContent(),
      description: "DE keep",
      meta_title: "T",
    });
  });
});
