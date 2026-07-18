import { describe, expect, it } from "vitest";
import {
  AI4T_ADDON_PRICE_MONTHLY,
  PLAN_CATALOG,
  PLAN_CATALOG_SEED,
  VOLUME_DISCOUNT_PCT,
  calculateCatalogPrice,
  formatPlanMarketingLimits,
  isPlanAvailableForMemberCount,
  kickoffPaidFeatures,
  suggestPlanForMemberCount,
} from "@/lib/plan-catalog";
import {
  NO_PLAN_LIMITS,
  getKickoffPaidLimits,
  getPlanLimits,
  getPlanAiMonthlyCaps,
  isFeatureAvailable,
  isWithinAdminLimit,
  isWithinMemberLimit,
  isWithinTeamLimit,
} from "@/lib/plan-limits";

describe("plan catalog packaging (2026-07 commercial ladder)", () => {
  it("keeps yearly prices at 20% off monthly × 12", () => {
    for (const plan of Object.values(PLAN_CATALOG)) {
      expect(plan.basePrice.yearly).toBeCloseTo(plan.basePrice.monthly * 12 * 0.8, 5);
      expect(plan.memberPrice.yearly).toBeCloseTo(plan.memberPrice.monthly * 12 * 0.8, 5);
    }
  });

  it("formats marketing limit lines from catalogue caps", () => {
    expect(formatPlanMarketingLimits("kickoff", "en")).toContain("500");
    expect(formatPlanMarketingLimits("kickoff", "en")).toContain("3 admins");
    expect(formatPlanMarketingLimits("kickoff", "en")).toContain("1 GB");
    expect(formatPlanMarketingLimits("champions", "en")).toContain("fair use");
    expect(formatPlanMarketingLimits("pro", "de")).toContain("2.000");
    expect(formatPlanMarketingLimits("squad", "de")).toContain("5 Admins");
  });

  it("matches locked member / team / storage / admin / trainer caps", () => {
    expect(PLAN_CATALOG.kickoff.maxMembers).toBe(500);
    expect(PLAN_CATALOG.kickoff.maxTeams).toBe(10);
    expect(PLAN_CATALOG.kickoff.maxAdmins).toBe(3);
    expect(PLAN_CATALOG.kickoff.maxTrainers).toBe(10);
    expect(PLAN_CATALOG.kickoff.maxStorageMb).toBe(1024);

    expect(PLAN_CATALOG.squad.maxMembers).toBe(1000);
    expect(PLAN_CATALOG.squad.maxTeams).toBe(30);
    expect(PLAN_CATALOG.squad.maxAdmins).toBe(5);
    expect(PLAN_CATALOG.squad.maxTrainers).toBe(50);
    expect(PLAN_CATALOG.squad.maxStorageMb).toBe(10_240);

    expect(PLAN_CATALOG.pro.maxMembers).toBe(2000);
    expect(PLAN_CATALOG.pro.maxTeams).toBe(100);
    expect(PLAN_CATALOG.pro.maxAdmins).toBe(10);
    expect(PLAN_CATALOG.pro.maxTrainers).toBe(200);
    expect(PLAN_CATALOG.pro.maxStorageMb).toBe(51_200);
    expect(PLAN_CATALOG.pro.features.prioritySupport).toBe(true);

    expect(PLAN_CATALOG.champions.maxMembers).toBe(5000);
    expect(PLAN_CATALOG.champions.maxTeams).toBe(250);
    expect(PLAN_CATALOG.champions.maxAdmins).toBe(25);
    expect(PLAN_CATALOG.champions.maxTrainers).toBeNull();
    expect(PLAN_CATALOG.champions.maxStorageMb).toBe(153_600);
  });

  it("uses ~80% volume-discount thresholds", () => {
    expect(PLAN_CATALOG.kickoff.discountThreshold).toBe(400);
    expect(PLAN_CATALOG.squad.discountThreshold).toBe(800);
    expect(PLAN_CATALOG.pro.discountThreshold).toBe(1600);
    expect(PLAN_CATALOG.champions.discountThreshold).toBe(4000);
    expect(VOLUME_DISCOUNT_PCT).toBe(15);
  });

  it("matches plan-limits to catalog caps", () => {
    for (const plan of Object.values(PLAN_CATALOG)) {
      const limits = getPlanLimits(plan.id);
      expect(limits.maxMembers).toBe(plan.maxMembers);
      expect(limits.maxTeams).toBe(plan.maxTeams);
      expect(limits.maxStorageMb).toBe(plan.maxStorageMb);
      expect(limits.maxAdmins).toBe(plan.maxAdmins);
      expect(limits.features.announcements).toBe(plan.features.announcements);
    }
  });

  it("keeps seed snapshot aligned with catalog", () => {
    expect(PLAN_CATALOG_SEED.kickoff.max_users).toBe(PLAN_CATALOG.kickoff.maxMembers);
    expect(PLAN_CATALOG_SEED.champions.max_teams).toBe(PLAN_CATALOG.champions.maxTeams);
    expect(PLAN_CATALOG_SEED.pro.price_monthly).toBe(79);
  });

  it("Kick-off catalogue has ops modules but chat off by default", () => {
    const k = PLAN_CATALOG.kickoff.features;
    expect(k.announcements).toBe(true);
    expect(k.chat).toBe(false);
    expect(k.tasks).toBe(true);
    expect(k.duesTracking).toBe(true);
    expect(k.shop).toBe(true);
    expect(k.partners).toBe(true);
    expect(k.ai).toBe(false);
    expect(k.communication).toBe(true); // alias of announcements
  });

  it("paid Kick-off unlocks chat", () => {
    const paid = kickoffPaidFeatures();
    expect(paid.chat).toBe(true);
    expect(paid.directMessages).toBe(true);
    expect(getKickoffPaidLimits().features.chat).toBe(true);
  });

  it("deny-by-default: missing plan is NO_PLAN not Kick-off", () => {
    expect(getPlanLimits(null).isNoPlan).toBe(true);
    expect(getPlanLimits(undefined).isNoPlan).toBe(true);
    expect(getPlanLimits("garbage").isNoPlan).toBe(true);
    expect(getPlanLimits(null).maxMembers).toBe(0);
    expect(isFeatureAvailable(null, "members")).toBe(false);
    expect(NO_PLAN_LIMITS.features.members).toBe(false);
  });

  it("prices Kick-off 500 members with volume discount", () => {
    const monthly = calculateCatalogPrice("kickoff", 500, "monthly");
    expect(monthly.discount).toBe(true);
    expect(monthly.total).toBeCloseTo((19 + 500 * 0.15) * 0.85, 5);
    expect(monthly.total).toBeCloseTo(79.9, 5);
  });

  it("prices Pro without discount below threshold", () => {
    const monthly = calculateCatalogPrice("pro", 800, "monthly");
    expect(monthly.discount).toBe(false);
    expect(monthly.total).toBeCloseTo(79 + 800 * 0.3, 5);
  });

  it("applies volume discount for Pro above 1600", () => {
    const priced = calculateCatalogPrice("pro", 1700, "monthly");
    expect(priced.discount).toBe(true);
    expect(priced.total).toBeCloseTo((79 + 1700 * 0.3) * 0.85, 5);
  });

  it("recommends plans by member bands", () => {
    expect(suggestPlanForMemberCount(1)).toBe("kickoff");
    expect(suggestPlanForMemberCount(500)).toBe("kickoff");
    expect(suggestPlanForMemberCount(501)).toBe("squad");
    expect(suggestPlanForMemberCount(1000)).toBe("squad");
    expect(suggestPlanForMemberCount(1001)).toBe("pro");
    expect(suggestPlanForMemberCount(2000)).toBe("pro");
    expect(suggestPlanForMemberCount(2001)).toBe("champions");
    expect(suggestPlanForMemberCount(5000)).toBe("champions");
    expect(suggestPlanForMemberCount(5001)).toBe("bespoke");
  });

  it("blocks plan selection outside member limit", () => {
    expect(isPlanAvailableForMemberCount("kickoff", 500)).toBe(true);
    expect(isPlanAvailableForMemberCount("kickoff", 501)).toBe(false);
    expect(isPlanAvailableForMemberCount("squad", 1000)).toBe(true);
    expect(isPlanAvailableForMemberCount("bespoke", 99_999)).toBe(true);
  });

  it("enforces member / team / admin limits", () => {
    expect(isWithinMemberLimit("kickoff", 499)).toBe(true);
    expect(isWithinMemberLimit("kickoff", 500)).toBe(false);
    expect(isWithinTeamLimit("kickoff", 9)).toBe(true);
    expect(isWithinTeamLimit("kickoff", 10)).toBe(false);
    expect(isWithinAdminLimit("kickoff", 2)).toBe(true);
    expect(isWithinAdminLimit("kickoff", 3)).toBe(false);
  });

  it("prices AI add-on above token-cost floor", () => {
    expect(AI4T_ADDON_PRICE_MONTHLY).toBeGreaterThanOrEqual(15);
  });

  it("exports AI monthly caps from catalog", () => {
    expect(getPlanAiMonthlyCaps("pro").agentRuns).toBe(250);
  });
});
