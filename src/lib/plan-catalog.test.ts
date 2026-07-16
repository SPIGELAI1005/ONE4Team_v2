import { describe, expect, it } from "vitest";
import {
  AI4T_ADDON_PRICE_MONTHLY,
  PLAN_CATALOG,
  calculateCatalogPrice,
  suggestPlanForMemberCount,
} from "@/lib/plan-catalog";
import { getPlanLimits, getPlanAiMonthlyCaps } from "@/lib/plan-limits";

describe("plan catalog packaging", () => {
  it("keeps yearly prices at 20% off monthly × 12", () => {
    for (const plan of Object.values(PLAN_CATALOG)) {
      expect(plan.basePrice.yearly).toBeCloseTo(plan.basePrice.monthly * 12 * 0.8, 5);
      expect(plan.memberPrice.yearly).toBeCloseTo(plan.memberPrice.monthly * 12 * 0.8, 5);
    }
  });

  it("matches plan-limits to catalog caps", () => {
    for (const plan of Object.values(PLAN_CATALOG)) {
      const limits = getPlanLimits(plan.id);
      expect(limits.maxMembers).toBe(plan.maxMembers);
      expect(limits.maxTeams).toBe(plan.maxTeams);
      expect(limits.maxStorageMb).toBe(plan.maxStorageMb);
      expect(limits.features).toEqual(plan.features);
    }
  });

  it("prices an 800-member Pro club in a sustainable band", () => {
    const monthly = calculateCatalogPrice("pro", 800, "monthly");
    const yearly = calculateCatalogPrice("pro", 800, "yearly");
    expect(monthly.total).toBeCloseTo(79 + 800 * 0.3, 5);
    expect(yearly.total).toBeCloseTo(PLAN_CATALOG.pro.basePrice.yearly + 800 * PLAN_CATALOG.pro.memberPrice.yearly, 5);
    expect(monthly.total).toBeGreaterThan(250);
    expect(monthly.total).toBeLessThan(400);
    expect(yearly.total / 12).toBeGreaterThan(200);
    expect(yearly.total / 12).toBeLessThan(320);
  });

  it("applies volume discount for 1000-member Pro", () => {
    const priced = calculateCatalogPrice("pro", 1000, "monthly");
    expect(priced.discount).toBe(true);
    expect(priced.total).toBeCloseTo((79 + 1000 * 0.3) * 0.85, 5);
  });

  it("suggests Pro for 800–1000 member clubs", () => {
    expect(suggestPlanForMemberCount(800)).toBe("pro");
    expect(suggestPlanForMemberCount(1000)).toBe("pro");
    expect(suggestPlanForMemberCount(100)).toBe("kickoff");
    expect(suggestPlanForMemberCount(250)).toBe("squad");
    expect(suggestPlanForMemberCount(2000)).toBe("champions");
  });

  it("prices AI add-on above token-cost floor", () => {
    expect(AI4T_ADDON_PRICE_MONTHLY).toBeGreaterThanOrEqual(15);
  });

  it("exports AI monthly caps from catalog", () => {
    expect(PLAN_CATALOG.pro).toBeDefined();
    expect(getPlanAiMonthlyCaps("pro").agentRuns).toBe(250);
  });
});
