import { describe, expect, it } from "vitest";
import { shouldTryAgentInterpretation } from "@/lib/ai-agent/chat-action-heuristic";
import { mergeActivityClarifyAnswer, runAgentWorkflowFromUtterance } from "@/lib/ai-agent/run-agent-workflow-utterance";

describe("run-agent-workflow-utterance helpers", () => {
  it("skips pure coaching questions", () => {
    expect(shouldTryAgentInterpretation("How can we improve pressing?")).toBe(false);
  });

  it("detects cancel training commands", () => {
    expect(shouldTryAgentInterpretation("Cancel U12-1 training today")).toBe(true);
  });

  it("parses team and date from clarify answers", () => {
    const merged = mergeActivityClarifyAnswer({}, "U12-1 training today");
    expect(merged.team_name).toBe("U12-1");
    expect(merged.date_hint).toBe("today");
    expect(merged.activity_hint).toContain("U12-1");
  });

  it("returns skip for non-action messages without pending workflow", async () => {
    const result = await runAgentWorkflowFromUtterance({
      clubId: "club-1",
      message: "What is a good warm-up?",
      language: "en",
      canUseAgent: true,
    });
    expect(result.type).toBe("skip");
  });
});
