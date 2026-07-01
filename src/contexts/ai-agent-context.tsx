import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/hooks/use-language";
import { getBrowserTimezone } from "@/lib/ai-agent/voice-text";
import { usePermissions } from "@/hooks/use-permissions";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { useClubId } from "@/hooks/use-club-id";
import { canUseClubAgentWorkflows } from "@/lib/ai-agent-access";
import { proposeAgentRun, executeAgentRun } from "@/lib/ai-agent/api";
import { enrichAgentProposalDisplay, getCancelStepActivityId } from "@/lib/ai-agent/enrich-agent-proposal";
import type { AgentIntent, AgentPageContext, AgentProposeResponse, AgentExecuteResponse } from "@/lib/ai-agent/types";

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
  confirmProposal: () => Promise<AgentExecuteResponse | void>;
  dismissProposal: () => void;
  applyProposal: (proposal: AgentProposeResponse) => void;
  focusAgentIntent: (intent: AgentIntent) => void;
}

const AiAgentContext = createContext<AiAgentContextValue | null>(null);

interface AiAgentProviderInnerProps {
  clubId: string | null;
  canManageSchedule: boolean;
  canManageMembers: boolean;
  children: ReactNode;
}

function AiAgentProviderInner({
  clubId,
  canManageSchedule,
  canManageMembers,
  children,
}: AiAgentProviderInnerProps) {
  const { language } = useLanguage();

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
        timezone: getBrowserTimezone(),
      });
      const enriched = await enrichAgentProposalDisplay(proposal, clubId, language);
      setPendingProposal(enriched);
      return enriched;
    },
    [clubId, language, pageContext],
  );

  const confirmProposal = useCallback(async (): Promise<AgentExecuteResponse | void> => {
    if (!clubId || !pendingProposal) return;
    const cancelActivityId = getCancelStepActivityId(pendingProposal);
    setWorkflowBusy(true);
    try {
      const result = await executeAgentRun({
        clubId,
        runId: pendingProposal.run_id,
        idempotencyKey: crypto.randomUUID(),
        cancelActivityId,
        timezone: getBrowserTimezone(),
      });
      setPendingProposal(null);
      return result;
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

export function AiAgentProvider({ children }: { children: ReactNode }) {
  const { clubId } = useClubId();
  const perms = usePermissions();
  const gateRole = useModuleGateRole();
  const canManageSchedule = gateRole
    ? canUseClubAgentWorkflows(gateRole)
    : perms.has("schedule:write");

  return (
    <AiAgentProviderInner
      clubId={clubId}
      canManageSchedule={canManageSchedule}
      canManageMembers={perms.has("members:write")}
    >
      {children}
    </AiAgentProviderInner>
  );
}

/** Public club pages: explicit club + membership-derived permissions (no dashboard active club). */
export function ClubScopedAiAgentProvider({
  clubId,
  canManageSchedule,
  canManageMembers,
  children,
}: {
  clubId: string;
  canManageSchedule: boolean;
  canManageMembers: boolean;
  children: ReactNode;
}) {
  return (
    <AiAgentProviderInner
      clubId={clubId}
      canManageSchedule={canManageSchedule}
      canManageMembers={canManageMembers}
    >
      {children}
    </AiAgentProviderInner>
  );
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
