import { describe, expect, it } from "vitest";
import { annotateRowsWithHouseholdDiscount, buildHouseholdDiscountGroups } from "@/lib/member-household-discount";

describe("member-household-discount", () => {
  it("flags Fischer family on shared email, same surname and address", () => {
    const members = [
      {
        id: "1",
        email: "bjoern.fischer1@gmx.net",
        masterData: {
          first_name: "Konstantin",
          last_name: "Fischer",
          street_line: "Musterweg 1",
          postal_code: "80999",
          city: "München",
          internal_club_number: "11319",
        },
      },
      {
        id: "2",
        email: "bjoern.fischer1@gmx.net",
        masterData: {
          first_name: "Bjoern",
          last_name: "Fischer",
          street_line: "Musterweg 1",
          postal_code: "80999",
          city: "München",
          internal_club_number: "20000",
        },
      },
      {
        id: "3",
        email: "bjoern.fischer1@gmx.net",
        masterData: {
          first_name: "Katharina",
          last_name: "Fischer",
          street_line: "Musterweg 1",
          postal_code: "80999",
          city: "München",
          internal_club_number: "11738",
        },
      },
    ];

    const { groups, rows } = annotateRowsWithHouseholdDiscount(members);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.eligibleForFamilyDiscount).toBe(true);
    expect(groups[0]?.members).toHaveLength(3);
    expect(rows.every((row) => row.masterData.household_discount_status === "pending_verification")).toBe(true);
  });

  it("does not flag shared email when surnames differ", () => {
    const groups = buildHouseholdDiscountGroups([
      {
        id: "a",
        email: "family@example.com",
        firstName: "Anna",
        lastName: "Meyer",
        streetLine: "A",
        postalCode: "80331",
        city: "München",
      },
      {
        id: "b",
        email: "family@example.com",
        firstName: "Ben",
        lastName: "Schulz",
        streetLine: "A",
        postalCode: "80331",
        city: "München",
      },
    ]);
    expect(groups.every((g) => !g.eligibleForFamilyDiscount)).toBe(true);
  });
});
