import { describe, expect, it } from "vitest";
import {
  buildAnnualMemberSummary,
  getPackageTotal,
  parsePriceComponents,
  sumPriceComponents,
  type MembershipFeePackage,
} from "./membership-fee-packages";

function pkg(overrides: Partial<MembershipFeePackage>): MembershipFeePackage {
  return {
    id: "1",
    club_id: "c1",
    name: "Test",
    amount: 100,
    currency: "EUR",
    interval: "yearly",
    description: null,
    is_active: true,
    ...overrides,
  };
}

describe("membership-fee-packages", () => {
  it("parses and sums price components", () => {
    const raw = [{ label: "Base", amount: 168 }, { label: "Levy", amount: 100 }];
    expect(parsePriceComponents(raw)).toHaveLength(2);
    expect(sumPriceComponents(parsePriceComponents(raw))).toBe(268);
  });

  it("uses amount when no components", () => {
    expect(getPackageTotal(pkg({ amount: 192, price_components: [] }))).toBe(192);
  });

  it("builds annual summary for youth adult senior with shared levy", () => {
    const packages = [
      pkg({ id: "y", name: "Jugend", amount: 168, fee_kind: "membership", member_category: "youth" }),
      pkg({ id: "a", name: "Erwachsener", amount: 192, fee_kind: "membership", member_category: "adult" }),
      pkg({ id: "s", name: "Senioren", amount: 120, fee_kind: "membership", member_category: "senior" }),
      pkg({ id: "l", name: "Sonderumlage", amount: 100, fee_kind: "levy", member_category: "shared" }),
      pkg({ id: "j", name: "Aufnahme", amount: 30, fee_kind: "joining", member_category: "youth", interval: "one_time" }),
    ];

    const summary = buildAnnualMemberSummary(packages, {
      youth: "Youth",
      adult: "Adult",
      senior: "Senior",
    });

    expect(summary).toHaveLength(3);
    expect(summary[0]).toMatchObject({ membershipTotal: 168, levyTotal: 100, grandTotal: 268 });
    expect(summary[1]).toMatchObject({ membershipTotal: 192, levyTotal: 100, grandTotal: 292 });
    expect(summary[2]).toMatchObject({ membershipTotal: 120, levyTotal: 100, grandTotal: 220 });
  });

  it("splits levy from price components inside membership packages", () => {
    const packages = [
      pkg({
        id: "y",
        name: "Youth Years / Jugend Jahr",
        amount: 268,
        fee_kind: "membership",
        member_category: "youth",
        price_components: [
          { label: "Jugend Jahr", amount: 168 },
          { label: "Sonderumlage", amount: 100 },
        ],
      }),
      pkg({
        id: "a",
        name: "Adult / Erwachsener",
        amount: 292,
        fee_kind: "membership",
        member_category: "adult",
        price_components: [
          { label: "Erwachsener", amount: 192 },
          { label: "Sonderumlage", amount: 100 },
        ],
      }),
    ];

    const summary = buildAnnualMemberSummary(packages, {
      youth: "Youth",
      adult: "Adult",
      senior: "Senior",
    });

    expect(summary[0]).toMatchObject({ membershipTotal: 168, levyTotal: 100, grandTotal: 268 });
    expect(summary[1]).toMatchObject({ membershipTotal: 192, levyTotal: 100, grandTotal: 292 });
  });
});
