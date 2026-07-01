import { describe, expect, it } from "vitest";
import { prepareChatMessagesForApi } from "./ai-chat-memory";
import { canUseClubAgentWorkflows, resolveAiContextScope } from "./ai-agent-access";

describe("prepareChatMessagesForApi", () => {
  it("keeps the most recent turns within limits", () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i}`,
    }));
    const trimmed = prepareChatMessagesForApi(messages, { maxTurns: 10 });
    expect(trimmed).toHaveLength(10);
    expect(trimmed[0].content).toBe("msg-30");
  });
});

describe("ai-agent-access", () => {
  it("allows workflows for trainer roles only", () => {
    expect(canUseClubAgentWorkflows("trainer")).toBe(true);
    expect(canUseClubAgentWorkflows("player")).toBe(false);
    expect(canUseClubAgentWorkflows("member")).toBe(false);
  });

  it("resolves context scope from gate role", () => {
    expect(resolveAiContextScope("player")).toBe("player");
    expect(resolveAiContextScope("member")).toBe("member");
    expect(resolveAiContextScope("trainer")).toBe("staff");
  });
});
