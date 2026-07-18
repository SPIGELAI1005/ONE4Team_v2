import { describe, expect, it } from "vitest";
import {
  resolveEffectivePlan,
  canUseEffectiveFeature,
  potentialKickoffMrr,
} from "@/lib/effective-plan";

describe("resolveEffectivePlan", () => {
  it("returns NO_PLAN when nothing assigned", () => {
    const r = resolveEffectivePlan({ planId: null, status: null });
    expect(r.planId).toBe("no_plan");
    expect(r.limits.isNoPlan).toBe(true);
    expect(canUseEffectiveFeature(r, "members")).toBe(false);
  });

  it("promotional Founding Club is Kick-off announcements-only", () => {
    const r = resolveEffectivePlan({
      planId: "kickoff",
      status: "promotional",
      accessSource: "commercial_offer",
      commercialOfferActive: true,
    });
    expect(r.isPromotional).toBe(true);
    expect(r.limits.features.announcements).toBe(true);
    expect(r.limits.features.chat).toBe(false);
    expect(r.limits.features.tasks).toBe(true);
    expect(r.writeAccess).toBe(true);
  });

  it("operator full access unlocks bespoke features", () => {
    const r = resolveEffectivePlan({
      planId: "kickoff",
      status: "promotional",
      commercialOfferActive: true,
      operatorFullAccess: true,
    });
    expect(r.accessSource).toBe("operator_grant");
    expect(r.limits.features.chat).toBe(true);
    expect(r.limits.features.ai).toBe(true);
  });

  it("module override can enable chat on promotional kickoff", () => {
    const r = resolveEffectivePlan({
      planId: "kickoff",
      status: "promotional",
      commercialOfferActive: true,
      moduleOverrides: [{ moduleKey: "communication", enabled: true }],
    });
    // communication module maps announcements+chat — enabling module sets both true in applyModuleOverrides
    expect(r.limits.features.chat).toBe(true);
  });

  it("grandfathered kickoff unlocks chat", () => {
    const r = resolveEffectivePlan({
      planId: "kickoff",
      status: "active",
      grandfatherKickoff: true,
    });
    expect(r.isGrandfathered).toBe(true);
    expect(r.limits.features.chat).toBe(true);
  });

  it("paid stripe kickoff unlocks chat", () => {
    const r = resolveEffectivePlan({
      planId: "kickoff",
      status: "active",
      accessSource: "stripe",
    });
    expect(r.limits.features.chat).toBe(true);
  });

  it("grace disables writes", () => {
    const r = resolveEffectivePlan({
      planId: "kickoff",
      status: "grace",
      inGracePeriod: true,
      accessSource: "commercial_offer",
    });
    expect(r.status).toBe("grace");
    expect(r.writeAccess).toBe(false);
  });

  it("excludes promotional clubs from paid-style pricing via potential MRR helper", () => {
    expect(potentialKickoffMrr(500)).toBeCloseTo(79.9, 5);
  });
});
