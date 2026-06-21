import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/use-permissions";
import { useClubId } from "@/hooks/use-club-id";
import { proposeAgentRun, executeAgentRun } from "@/lib/ai-agent/api";
import type { AgentIntent, AgentPageContext, AgentProposeResponse } from "@/lib/ai-agent/types";

interface AiAgentContextValue {
  clubId: string | null;
  language: "en" | "de";
  canManageSchedule: boolean;
  canManageMembers: boolean;
  pageContext: AgentPageContext;
  registerPageContext: (ctx: AgentPageContext | null) => void;
  sheetOpen: boolean;
  openAgent: (intent?: AgentIntent) => void;
  closeAgent: () => void;
  initialIntent: AgentIntent | null;
  clearInitialIntent: () => void;
  pendingProposal: AgentProposeResponse | null;
  workflowBusy: boolean;
  propose: (
    intent: AgentIntent,
    params: Record<string, unknown>,
    opts?: { conversationId?: string | null; pageContext?: AgentPageContext },
  ) => Promise<AgentProposeResponse>;
  confirmProposal: () => Promise<void>;
  dismissProposal: () => void;
  applyProposal: (proposal: AgentProposeResponse) => void;
  focusAgentIntent: (intent: AgentIntent) => void;
}

const AiAgentContext = createContext<AiAgentContextValue | null>(null);

export function AiAgentProvider({ children }: { children: ReactNode }) {
  const { clubId } = useClubId();
  const { language } = useLanguage();
  const perms = usePermissions();

  const canManageSchedule = perms.has("schedule:write");
  const canManageMembers = perms.has("members:write");

  const [pageContext, setPageContext] = useState<AgentPageContext>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [initialIntent, setInitialIntent] = useState<AgentIntent | null>(null);
  const [pendingProposal, setPendingProposal] = useState<AgentProposeResponse | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);

  const registerPageContext = useCallback((ctx: AgentPageContext | null) => {
    setPageContext(ctx ?? {});
  }, []);

  const openAgent = useCallback((intent?: AgentIntent) => {
    if (intent) setInitialIntent(intent);
    setSheetOpen(true);
  }, []);

  const closeAgent = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const clearInitialIntent = useCallback(() => {
    setInitialIntent(null);
  }, []);

  const propose = useCallback(
    async (
      intent: AgentIntent,
      params: Record<string, unknown>,
      opts?: { conversationId?: string | null; pageContext?: AgentPageContext },
    ) => {
      if (!clubId) throw new Error("no_club");
      const mergedContext: AgentPageContext = {
        ...pageContext,
        ...(opts?.pageContext ?? {}),
      };
      const proposal = await proposeAgentRun({
        clubId,
        intent,
        params,
        language,
        pageContext: mergedContext,
        conversationId: opts?.conversationId ?? null,
      });
      setPendingProposal(proposal);
      return proposal;
    },
    [clubId, language, pageContext],
  );

  const confirmProposal = useCallback(async () => {
    if (!clubId || !pendingProposal) return;
    setWorkflowBusy(true);
    try {
      await executeAgentRun({
        clubId,
        runId: pendingProposal.run_id,
        idempotencyKey: crypto.randomUUID(),
      });
      setPendingProposal(null);
    } finally {
      setWorkflowBusy(false);
    }
  }, [clubId, pendingProposal]);

  const dismissProposal = useCallback(() => {
    setPendingProposal(null);
  }, []);

  const applyProposal = useCallback((proposal: AgentProposeResponse) => {
    setPendingProposal(proposal);
  }, []);

  const focusAgentIntent = useCallback((intent: AgentIntent) => {
    setInitialIntent(intent);
  }, []);

  const value = useMemo(
    (): AiAgentContextValue => ({
      clubId,
      language,
      canManageSchedule,
      canManageMembers,
      pageContext,
      registerPageContext,
      sheetOpen,
      openAgent,
      closeAgent,
      initialIntent,
      clearInitialIntent,
      pendingProposal,
      workflowBusy,
      propose,
      confirmProposal,
      dismissProposal,
      applyProposal,
      focusAgentIntent,
    }),
    [
      clubId,
      language,
      canManageSchedule,
      canManageMembers,
      pageContext,
      registerPageContext,
      sheetOpen,
      openAgent,
      closeAgent,
      initialIntent,
      clearInitialIntent,
      pendingProposal,
      workflowBusy,
      propose,
      confirmProposal,
      dismissProposal,
      applyProposal,
      focusAgentIntent,
    ],
  );

  return <AiAgentContext.Provider value={value}>{children}</AiAgentContext.Provider>;
}

export function useAiAgent(): AiAgentContextValue {
  const ctx = useContext(AiAgentContext);
  if (!ctx) {
    throw new Error("useAiAgent must be used within AiAgentProvider");
  }
  return ctx;
}

export function useAiAgentOptional(): AiAgentContextValue | null {
  return useContext(AiAgentContext);
}
