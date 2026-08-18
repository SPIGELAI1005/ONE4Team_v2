import { describe, expect, it } from "vitest";
import {
  championsGranularEntitlements,
  kickoffGranularEntitlements,
  proGranularEntitlements,
  squadGranularEntitlements,
} from "@/lib/plan-entitlements";

describe("plan-entitlements Prompt 17", () => {
  it("gives polls + ICS to Kick-off and Squad", () => {
    expect(kickoffGranularEntitlements().polls).toBe(true);
    expect(kickoffGranularEntitlements().calendarIcs).toBe(true);
    expect(squadGranularEntitlements().polls).toBe(true);
    expect(squadGranularEntitlements().calendarIcs).toBe(true);
  });

  it("keeps cashbox + carpool/guests off until Pro+", () => {
    expect(kickoffGranularEntitlements().teamCashbox).toBe(false);
    expect(kickoffGranularEntitlements().carpoolGuests).toBe(false);
    expect(squadGranularEntitlements().teamCashbox).toBe(false);
    expect(squadGranularEntitlements().carpoolGuests).toBe(false);
    expect(proGranularEntitlements().teamCashbox).toBe(true);
    expect(proGranularEntitlements().carpoolGuests).toBe(true);
    expect(championsGranularEntitlements().teamCashbox).toBe(true);
    expect(championsGranularEntitlements().carpoolGuests).toBe(true);
  });
});
