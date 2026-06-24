import { useEffect } from "react";
import { useAiAgentOptional } from "@/contexts/ai-agent-context";
import type { AgentPageContext } from "@/lib/ai-agent/types";

/** Register page-specific context for AI 4 T Agent (cleared on unmount). */
export function useRegisterAiAgentContext(ctx: AgentPageContext | null) {
  const agent = useAiAgentOptional();

  useEffect(() => {
    if (!agent) return;
    agent.registerPageContext(ctx);
    return () => {
      agent.registerPageContext(null);
    };
  }, [agent, ctx?.source, ctx?.entityType, ctx?.entityId, ctx?.teamId, ctx?.teamName]);
}
