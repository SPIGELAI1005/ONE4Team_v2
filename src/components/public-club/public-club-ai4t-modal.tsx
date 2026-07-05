import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ClipboardList,
  ExternalLink,
  History,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Ai4TeamAgentIcon } from "@/components/ai-agent/Ai4TeamNavIcon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ai4TWordmark } from "@/components/ai/Ai4TWordmark";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { Ai4tEmbedChat } from "@/components/ai/Ai4tEmbedChat";
import { AiAgentWorkspace } from "@/components/ai-agent/AiAgentWorkspace";
import { ClubScopedAiAgentProvider } from "@/contexts/ai-agent-context";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubReportPersona } from "@/hooks/use-public-club-report-persona";
import { useLanguage } from "@/hooks/use-language";
import {
  AI4T_INTRO_ROLES,
  buildAi4TRoleQuickPrompts,
  getAi4TAssistantRoleName,
  type Ai4TRoleKey,
} from "@/lib/ai-4-t-role-prompts";
import {
  aiRoleToAgentPerms,
  resolvePublicClubAiRole,
} from "@/lib/public-club-ai-role";
import { clubAi4tModalOverlayClass, clubAi4tModalPanelClass } from "@/lib/public-club-glass-classes";
import { cn } from "@/lib/utils";
import { ai4tMainTabListClass, ai4tMainTabTriggerClass } from "@/lib/ai4t-tab-classes";

const FEATURE_IDS = ["chat", "agent", "plans", "context", "workflows", "history"] as const;
type FeatureId = (typeof FEATURE_IDS)[number];

const FEATURE_ICONS: Record<FeatureId, typeof MessageSquare> = {
  chat: MessageSquare,
  agent: Ai4TeamAgentIcon,
  plans: ClipboardList,
  context: Building2,
  workflows: ShieldCheck,
  history: History,
};

export function PublicClubAi4tModal() {
  const { t, language } = useLanguage();
  const intro = t.ai4tIntro;
  const {
    club,
    basePath,
    searchSuffix,
    user,
    showAi4tModal,
    setShowAi4tModal,
    ai4tInitialPrompt,
    ai4teamLaunch,
    goToAuthWithReturn,
    homeTeamFilterId,
    membershipId,
    membershipRole,
  } = usePublicClub();

  const isSignedIn = Boolean(user);
  const [mainTab, setMainTab] = useState<"chat" | "agent" | "guide">("chat");
  const [guideRole, setGuideRole] = useState<Ai4TRoleKey>("trainer");
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const { persona, loading: personaLoading } = usePublicClubReportPersona(club?.id, membershipId, membershipRole);
  const memberRole = useMemo(
    () => (isSignedIn ? resolvePublicClubAiRole(persona, membershipRole) : ("member" as Ai4TRoleKey)),
    [isSignedIn, membershipRole, persona],
  );

  const guidePrompts = useMemo(
    () => buildAi4TRoleQuickPrompts(isSignedIn ? memberRole : guideRole, language),
    [guideRole, isSignedIn, language, memberRole],
  );
  const assistantName = getAi4TAssistantRoleName(isSignedIn ? memberRole : guideRole);
  const guideLimitsRole = isSignedIn ? memberRole : guideRole;
  const agentPerms = useMemo(() => aiRoleToAgentPerms(memberRole), [memberRole]);
  const showAgentTab = isSignedIn && (agentPerms.canManageSchedule || agentPerms.canManageMembers);
  const returnPath = `${basePath}${searchSuffix}`;

  useEffect(() => {
    if (!showAi4tModal) {
      setMainTab("chat");
      setChatSeed(null);
      setGuideRole("trainer");
      return;
    }
    setMainTab(isSignedIn ? "chat" : "guide");
    if (isSignedIn && user && club?.id) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
    }
    if (ai4tInitialPrompt) {
      setChatSeed(ai4tInitialPrompt);
      if (isSignedIn) setMainTab("chat");
    }
  }, [showAi4tModal, isSignedIn, user, club?.id, ai4tInitialPrompt]);

  useEffect(() => {
    if (showAi4tModal && isSignedIn) {
      setGuideRole(memberRole);
    }
  }, [showAi4tModal, isSignedIn, memberRole]);

  useEffect(() => {
    if (!showAi4tModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAi4tModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAi4tModal, setShowAi4tModal]);

  const usePromptInChat = (prompt: string) => {
    setChatSeed(prompt);
    setMainTab("chat");
  };

  if (!club) return null;

  const modalBody = (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-ai4t-title"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "flex h-[min(92vh,880px)] w-full flex-col overflow-hidden sm:max-w-3xl lg:max-w-4xl",
        clubAi4tModalPanelClass,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 border-b border-neutral-200/80 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 pr-2 sm:gap-4">
            <Ai4TWordmark id="club-ai4t-title" className="h-10 w-auto shrink-0 max-w-[min(42vw,180px)] sm:h-11 sm:max-w-[200px]" />
            <p className="min-w-0 text-sm leading-snug text-neutral-600">
              {intro.subtitleForClub.replace("{club}", club.name)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-neutral-700 hover:bg-neutral-100"
            onClick={() => setShowAi4tModal(false)}
            aria-label={intro.close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as "chat" | "agent" | "guide")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 px-5 pb-3 sm:px-6">
          <TabsList
            className={cn(ai4tMainTabListClass, showAgentTab ? "grid-cols-3" : "grid-cols-2")}
          >
            <TabsTrigger value="chat" className={ai4tMainTabTriggerClass}>
              <MessageSquare className="h-3.5 w-3.5" />
              {intro.tabChat}
            </TabsTrigger>
            {showAgentTab ? (
              <TabsTrigger value="agent" className={ai4tMainTabTriggerClass}>
                <Ai4TeamAgentIcon />
                {t.coTrainerPage.tabAgent}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="guide" className={ai4tMainTabTriggerClass}>
              <Sparkles className="h-3.5 w-3.5" />
              {intro.tabGuide}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <TabsContent
            value="chat"
            className="absolute inset-0 mt-0 flex flex-col overflow-hidden px-5 pb-3 pt-2 opacity-100 transition-opacity data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 sm:px-6"
          >
            <Ai4tEmbedChat
              clubId={club.id}
              clubName={club.name}
              roleKey={memberRole}
              isSignedIn={isSignedIn}
              primaryColor={club.primary_color}
              publicTeamId={homeTeamFilterId || null}
              seedPrompt={chatSeed}
              onSeedConsumed={() => setChatSeed(null)}
              onRequestSignIn={() => goToAuthWithReturn(returnPath)}
              onWorkflowProposal={() => setMainTab("agent")}
            />
          </TabsContent>

          {showAgentTab ? (
            <TabsContent
              value="agent"
              className="absolute inset-0 mt-0 flex flex-col overflow-hidden px-5 py-0 opacity-100 transition-opacity data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 sm:px-6"
            >
              <AiAgentWorkspace compact />
            </TabsContent>
          ) : null}

          <TabsContent
            value="guide"
            className="absolute inset-0 mt-0 overflow-y-auto px-5 py-4 opacity-100 transition-opacity data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0 sm:px-6"
          >
                <p className="text-sm leading-relaxed text-neutral-600">
                  <BrandedText text={intro.overview} />
                </p>

                {intro.guideRoleLimits[guideLimitsRole] ? (
                  <div className="mt-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">{intro.guideRoleLimitsTitle}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          {intro.guideCan}
                        </div>
                        <ul className="mt-1.5 space-y-1 text-xs text-neutral-700">
                          {intro.guideRoleLimits[guideLimitsRole].can.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                          {intro.guideCannot}
                        </div>
                        <ul className="mt-1.5 space-y-1 text-xs text-neutral-700">
                          {intro.guideRoleLimits[guideLimitsRole].cannot.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FEATURE_IDS.map((id) => {
                    const Icon = FEATURE_ICONS[id];
                    const feature = intro.features[id];
                    return (
                      <div key={id} className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-3">
                        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[color:var(--club-primary)] shadow-sm">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-xs font-semibold text-neutral-900">{feature.title}</div>
                        <p className="mt-1 text-[11px] leading-snug text-neutral-600">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900">{intro.examplePromptsTitle}</h3>
                    <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      {assistantName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {isSignedIn ? intro.guidePromptsForYourRole : intro.examplePromptsHintClub}
                  </p>

                  {!isSignedIn ? (
                    <div className="mt-3 flex gap-1.5 overflow-x-auto px-0.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {AI4T_INTRO_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setGuideRole(role)}
                          className={cn(
                            "box-border shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors",
                            guideRole === role
                              ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/10 text-neutral-900"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                          )}
                        >
                          {intro.roles[role]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <span className="inline-flex rounded-full border border-[color:var(--club-primary)]/30 bg-[color:var(--club-primary)]/10 px-3 py-1 text-xs font-medium text-neutral-900">
                        {intro.roles[memberRole]}
                        {personaLoading ? " …" : null}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {guidePrompts.map((qp) => (
                      <button
                        key={qp.label}
                        type="button"
                        onClick={() => usePromptInChat(qp.prompt)}
                        className="rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-[color:var(--club-primary)]/40 hover:bg-neutral-50"
                      >
                        <div className="text-xs font-semibold text-neutral-900">{qp.label}</div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-600">{qp.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>

            <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">{intro.scopeNote}</p>
          </TabsContent>
        </div>
      </Tabs>

      <div className="shrink-0 border-t border-neutral-200/80 bg-white/70 px-5 py-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            {isSignedIn ? <BrandedText text={intro.footerSignedIn} /> : <BrandedText text={intro.footerSignedOut} />}
          </p>
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => ai4teamLaunch()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
            >
              <BrandedText text={intro.openFullWorkspace} />
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {showAi4tModal ? (
        <div
          className={cn("fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4", clubAi4tModalOverlayClass)}
          onClick={() => setShowAi4tModal(false)}
          role="presentation"
        >
          {isSignedIn ? (
            <ClubScopedAiAgentProvider
              clubId={club.id}
              canManageSchedule={agentPerms.canManageSchedule}
              canManageMembers={agentPerms.canManageMembers}
            >
              {modalBody}
            </ClubScopedAiAgentProvider>
          ) : (
            modalBody
          )}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
