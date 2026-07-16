import { describe, expect, it } from "vitest";
import {
  AI_MONTHLY_CAPS,
  AI_USAGE_WARN_RATIO,
  buildAiUsageMeterState,
  formatAiCapLabel,
  getAiMonthlyCaps,
} from "@/lib/ai-usage-meter";

describe("ai-usage-meter", () => {
  it("returns plan-specific monthly caps", () => {
    expect(getAiMonthlyCaps("pro").agentRuns).toBe(250);
    expect(getAiMonthlyCaps("bespoke").agentRuns).toBeGreaterThan(100_000);
    expect(getAiMonthlyCaps(null).agentRuns).toBe(AI_MONTHLY_CAPS.kickoff.agentRuns);
  });

  it("flags near-cap and at-cap states", () => {
    const proCaps = getAiMonthlyCaps("pro");
    const near = buildAiUsageMeterState("pro", {
      agentRuns: Math.floor(proCaps.agentRuns * AI_USAGE_WARN_RATIO),
      conversations: 10,
    });
    expect(near.isNearCap).toBe(true);
    expect(near.isAtCap).toBe(false);

    const atCap = buildAiUsageMeterState("pro", {
      agentRuns: proCaps.agentRuns,
      conversations: 0,
    });
    expect(atCap.isAtCap).toBe(true);
    expect(atCap.isNearCap).toBe(false);
  });

  it("formats cap labels", () => {
    expect(formatAiCapLabel(12, 250)).toBe("12 / 250");
    expect(formatAiCapLabel(5, 999_999)).toContain("∞");
  });
});
