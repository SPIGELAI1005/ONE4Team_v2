import { describe, expect, it } from "vitest";
import type { AgentProposalPayload } from "@/lib/ai-agent/types";
import { extractCancelTrainingTarget, formatTrainingWhen } from "@/lib/ai-agent/proposal-display";

describe("proposal-display", () => {
  it("extracts cancel training target from step params", () => {
    const body: AgentProposalPayload = {
      title: "Cancel training",
      summary: "…",
      steps: [
        {
          tool: "cancel_training",
          label: "Cancel session",
          params: {
            activity_id: "abc",
            team_name: "U12-1",
            activity_title: "Training",
            starts_at: "2026-06-24T16:00:00.000Z",
            reason: "Pitch flooded",
          },
        },
      ],
    };

    const target = extractCancelTrainingTarget(body, "en");
    expect(target?.teamName).toBe("U12-1");
    expect(target?.title).toBe("Training");
    expect(target?.reason).toBe("Pitch flooded");
    expect(target?.when).toBeTruthy();
  });

  it("parses cancel target from proposal summary when step params are sparse", () => {
    const body: AgentProposalPayload = {
      title: "Cancel training",
      summary: "The following session will be cancelled: U12-1 · Training · 24 Jun 2026, 18:00. Reason: rain",
      steps: [
        {
          tool: "cancel_training",
          label: "Cancel session",
          params: { activity_id: "abc", reason: "rain" },
        },
      ],
    };

    const target = extractCancelTrainingTarget(body, "en");
    expect(target?.teamName).toBe("U12-1");
    expect(target?.title).toBe("Training");
    expect(target?.when).toContain("2026");
    expect(target?.reason).toBe("rain");
  });
});
