import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, LogIn, Sparkles } from "lucide-react";
import { Ai4tAssistantMessage } from "@/components/ai/Ai4tAssistantMessage";
import { Button } from "@/components/ui/button";
import { Ai4TBrand, BrandedText } from "@/components/ai/Ai4TBrand";
import { Ai4tChatComposer } from "@/components/ai/Ai4tChatComposer";
import { Ai4tChatWatermark } from "@/components/ai/Ai4tChatWatermark";
import { AiAgentProposalCard } from "@/components/ai-agent/AiAgentProposalCard";
import { useAuth } from "@/contexts/useAuth";
import { useAiAgentOptional } from "@/contexts/ai-agent-context";
import { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { buildClubContext, mergeQuickPrompts, type ClubQuickPrompt } from "@/lib/ai-context";
import { aiRoleToContextScope } from "@/lib/public-club-ai-role";
import { buildFollowUpPrompts } from "@/lib/ai-follow-up-prompts";
import { Ai4tFollowUpChips } from "@/components/ai/Ai4tFollowUpChips";
import { useUserTeamIds } from "@/hooks/use-user-team-ids";
import { streamCoTrainerChat, type Ai4TChatMessage } from "@/lib/ai-4-t-chat-stream";
import {
  buildAi4TRoleQuickPrompts,
  getAi4TRoleWelcomeMessage,
  getAi4TAssistantRoleName,
  type Ai4TRoleKey,
} from "@/lib/ai-4-t-role-prompts";
import { clubCtaFillHoverClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";
import {
  formatTeamAccessDeniedMessage,
  type PendingWorkflowState,
} from "@/lib/ai-agent/chat-workflow-handler";
import { buildProposalUnderstandingMessage } from "@/lib/ai-agent/enrich-agent-proposal";
import { runAgentWorkflowFromUtterance } from "@/lib/ai-agent/run-agent-workflow-utterance";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Ai4tEmbedChatProps {
  clubId: string;
  clubName: string;
  roleKey: Ai4TRoleKey;
  isSignedIn: boolean;
  primaryColor?: string | null;
  seedPrompt?: string | null;
  publicTeamId?: string | null;
  onSeedConsumed?: () => void;
  onRequestSignIn: () => void;
  onWorkflowProposal?: () => void;
}

async function simulateWordStream(text: string, onChunk: (assistantSoFar: string) => void) {
  let soFar = "";
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    soFar += (i === 0 ? "" : " ") + words[i];
    onChunk(soFar);
    const delay = words[i].endsWith(".") || words[i].endsWith("!") || words[i].endsWith(":") ? 40 : 18;
    await new Promise((r) => setTimeout(r, delay));
  }
}

function mapMembershipRole(role: string | null | undefined): Ai4TRoleKey {
  if (!role) return "member";
  if (role === "admin" || role === "club_admin") return "admin";
  if ((["trainer", "player", "member", "staff", "parent", "sponsor", "supplier", "service_provider", "consultant"] as const).includes(role as Ai4TRoleKey)) {
    return role as Ai4TRoleKey;
  }
  return "member";
}

export function Ai4tEmbedChat({
  clubId,
  clubName,
  roleKey,
  isSignedIn,
  primaryColor,
  seedPrompt,
  publicTeamId,
  onSeedConsumed,
  onRequestSignIn,
  onWorkflowProposal,
}: Ai4tEmbedChatProps) {
  const { user } = useAuth();
  const agent = useAiAgentOptional();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Ai4TChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingWorkflow, setPendingWorkflow] = useState<PendingWorkflowState | null>(null);
  const [clubContextText, setClubContextText] = useState("");
  const [smartPrompts, setSmartPrompts] = useState<ClubQuickPrompt[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [followUpPrompts, setFollowUpPrompts] = useState<ClubQuickPrompt[]>([]);
  const { teamIds: userTeamIds } = useUserTeamIds(isSignedIn ? clubId : null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const assistantContentRef = useRef("");
  const aiVoice = useAi4TeamVoice(language);

  const assistantRoleName = useMemo(() => getAi4TAssistantRoleName(roleKey), [roleKey]);
  const fallbackPrompts = useMemo(() => buildAi4TRoleQuickPrompts(roleKey, language), [roleKey, language]);
  const quickPrompts = useMemo(() => mergeQuickPrompts(smartPrompts, fallbackPrompts, 4), [smartPrompts, fallbackPrompts]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isSignedIn || !clubId || !user?.id) {
      setClubContextText("");
      setSmartPrompts([]);
      return;
    }
    let cancelled = false;
    setContextLoading(true);
    void (async () => {
      const membershipRes = await supabase
        .from("club_memberships")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      const isAdmin = membershipRes.data?.role === "admin" || membershipRes.data?.role === "club_admin";
      const embedScope = aiRoleToContextScope(roleKey, publicTeamId);

      try {
        const data = await buildClubContext(supabase, {
          clubId,
          clubName,
          language,
          isAdmin,
          scope: embedScope,
          teamIds: userTeamIds,
          publicTeamId,
        });
        if (!cancelled) {
          setClubContextText(data.contextText);
          setSmartPrompts(data.suggestedPrompts);
        }
      } catch {
        if (!cancelled) {
          setClubContextText(`Club: ${clubName} | Club ID: ${clubId}`);
          setSmartPrompts([]);
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, clubName, isSignedIn, language, user?.id, roleKey, publicTeamId, userTeamIds]);

  useEffect(() => {
    if (!seedPrompt) return;
    setInput(seedPrompt);
    onSeedConsumed?.();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [seedPrompt, onSeedConsumed]);

  const upsertAssistant = useCallback((assistantSoFar: string) => {
    assistantContentRef.current = assistantSoFar;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
      }
      return [...prev, { role: "assistant", content: assistantSoFar }];
    });
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isLoading || !isSignedIn) return;

      aiVoice.stopSpeaking();
      assistantContentRef.current = "";

      const userMsg: Ai4TChatMessage = { role: "user", content: msg };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      const canUseAgent = Boolean(agent?.canManageSchedule);

      if (canUseAgent && agent?.clubId) {
        const workflow = await runAgentWorkflowFromUtterance({
          clubId: agent.clubId,
          message: msg,
          language,
          pendingWorkflow,
          canUseAgent: true,
          pageContext: { source: "public-club-chat" },
        });

        if (workflow.type !== "skip") {
          if (workflow.type === "clarify") {
            setPendingWorkflow(workflow.pending);
            setMessages([...newMessages, { role: "assistant", content: workflow.question }]);
            setIsLoading(false);
            return;
          }

          setPendingWorkflow(null);

          if (workflow.type === "denied") {
            setMessages([
              ...newMessages,
              { role: "assistant", content: formatTeamAccessDeniedMessage(workflow.body, language) },
            ]);
            setIsLoading(false);
            return;
          }

          if (workflow.type === "proposal") {
            agent.applyProposal(workflow.proposal);
            onWorkflowProposal?.();
            setMessages([
              ...newMessages,
              { role: "assistant", content: buildProposalUnderstandingMessage(workflow.proposal, language) },
            ]);
            setIsLoading(false);
            return;
          }

          if (workflow.type === "error") {
            toast({
              title: t.coTrainerPage.agent.proposeFailed,
              description: workflow.message,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
      }

      await streamCoTrainerChat({
        clubId,
        messages: newMessages,
        clubContextText,
        language,
        assistantRoleName,
        demoCopy: {
          intro: t.coTrainerPage.demoIntro,
          note: t.coTrainerPage.demoNote,
        },
        errorCopy: {
          invalidSupabaseUrl: t.coTrainerPage.chatErrorInvalidSupabaseUrl,
          noClub: t.coTrainerPage.chatErrorNoClub,
          signIn: t.coTrainerPage.chatErrorSignIn,
          serialize: t.coTrainerPage.chatErrorSerialize,
          noStream: t.coTrainerPage.chatErrorNoStream,
          emptyResponse: t.coTrainerPage.chatErrorEmptyResponse,
          network: t.coTrainerPage.chatErrorNetwork,
          detailPrefix: t.coTrainerPage.chatErrorDetailPrefix,
          heading: t.coTrainerPage.chatErrorHeading,
          hint: t.coTrainerPage.chatErrorHint,
          rateLimit: t.coTrainerPage.chatErrorRateLimit,
          planGate: t.coTrainerPage.chatErrorPlanGate,
          noApiKey: t.coTrainerPage.chatErrorNoApiKey,
          settingsLink: t.coTrainerPage.chatErrorSettingsLink,
        },
        onChunk: upsertAssistant,
        onError: (markdownBody, toastDescription) => {
          toast({
            title: <Ai4TBrand />,
            description: toastDescription,
            variant: "destructive",
          });
          upsertAssistant(markdownBody);
        },
        simulateStream: simulateWordStream,
      });

      setIsLoading(false);
      const finalReply = assistantContentRef.current.trim();
      if (finalReply) {
        aiVoice.speak(finalReply);
        setFollowUpPrompts(
          buildFollowUpPrompts(language, {
            hasUpcomingMatch: clubContextText.includes("vs "),
            hasTrainingThisWeek: clubContextText.includes("[training]") || clubContextText.includes("training"),
          }),
        );
      }
    },
    [
      agent,
      aiVoice,
      assistantRoleName,
      clubContextText,
      clubId,
      input,
      isLoading,
      isSignedIn,
      language,
      messages,
      pendingWorkflow,
      t.coTrainerPage,
      toast,
      upsertAssistant,
    ],
  );

  const handleChatProposalConfirm = useCallback(async () => {
    if (!agent) return;
    try {
      await agent.confirmProposal();
      toast({ title: t.coTrainerPage.agent.executeSuccess });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: language === "de" ? "Workflow wurde ausgeführt." : "Workflow completed.",
        },
      ]);
    } catch (e) {
      toast({
        title: t.coTrainerPage.agent.executeFailed,
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }, [agent, language, t.coTrainerPage.agent, toast]);

  const handleVoiceCommand = useCallback(
    (transcript: string) => {
      const text = transcript.trim();
      if (!text || isLoading) return;
      void handleSend(text);
    },
    [handleSend, isLoading],
  );

  if (!isSignedIn) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
          <Sparkles className="h-6 w-6 text-neutral-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            <BrandedText text={t.ai4tIntro.signInToChatTitle} />
          </p>
          <p className="mt-1 max-w-sm text-sm text-neutral-600">{t.ai4tIntro.signInToChatDesc}</p>
        </div>
        <Button
          type="button"
          className={cn("rounded-full font-semibold", clubCtaFillHoverClass)}
          style={clubCtaPrimaryInlineStyle(primaryColor)}
          onClick={onRequestSignIn}
        >
          <LogIn className="mr-2 h-4 w-4" />
          <BrandedText text={t.ai4tIntro.launchSignedOut} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="ai4t-subtle-scroll relative min-h-0 flex-1 overflow-y-auto px-1 py-3">
        <Ai4tChatWatermark />
        <div className="relative z-[1]">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4">
            <p className="text-sm text-neutral-700">
              {getAi4TRoleWelcomeMessage(roleKey, language, clubName)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {t.ai4tIntro.chatRoleHint.replace("{role}", assistantRoleName)}
              {contextLoading ? <Loader2 className="ml-1 inline h-3 w-3 animate-spin" /> : null}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => void handleSend(qp.prompt)}
                  disabled={isLoading}
                  className="rounded-xl border border-neutral-200 bg-white p-2.5 text-left text-xs font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={`${i}-${msg.role}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5",
                      msg.role === "user"
                        ? "text-sm text-white"
                        : "border border-neutral-200 bg-white text-sm text-neutral-900",
                    )}
                    style={
                      msg.role === "user"
                        ? {
                            backgroundColor: "var(--club-primary)",
                            color: readableTextOnSolid(primaryColor || "#C4A052"),
                          }
                        : undefined
                    }
                  >
                    {msg.role === "assistant" ? (
                      <Ai4tAssistantMessage
                        content={msg.content}
                        clubId={clubId}
                        conversationId={null}
                        messageIndex={i}
                        showFeedback={false}
                        tone="light"
                      />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && messages[messages.length - 1]?.role !== "assistant" ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-neutral-200 bg-white px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                </div>
              </div>
            ) : null}
          </div>
        )}
        </div>
      </div>

      {!isLoading && followUpPrompts.length > 0 && messages.length > 0 ? (
        <div className="shrink-0 px-3 pb-1">
          <Ai4tFollowUpChips
            prompts={followUpPrompts}
            disabled={isLoading}
            onSelect={(prompt) => void handleSend(prompt)}
          />
        </div>
      ) : null}

      {agent?.pendingProposal ? (
        <div className="shrink-0 border-t border-neutral-200/80 bg-white/95 px-1 py-2">
          <AiAgentProposalCard
            proposal={agent.pendingProposal}
            busy={agent.workflowBusy}
            variant="light"
            clubId={clubId}
            onConfirm={() => void handleChatProposalConfirm()}
            onDismiss={agent.dismissProposal}
          />
        </div>
      ) : null}

      <Ai4tChatComposer
        variant="club"
        value={input}
        onChange={setInput}
        onSend={() => void handleSend()}
        isLoading={isLoading}
        voice={aiVoice}
        onVoiceCommand={handleVoiceCommand}
        sendAriaLabel={t.coTrainerPage.tabChat}
        textareaRef={inputRef}
      />
    </div>
  );
}

export { mapMembershipRole };
