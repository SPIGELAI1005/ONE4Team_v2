import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  ExternalLink,
  Loader2,
  ScrollText,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAiAgent } from "@/contexts/ai-agent-context";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_INTENT_META, visibleIntentsForUser } from "@/lib/ai-agent/page-context";
import { formatTeamAccessDeniedMessage, type PendingWorkflowState } from "@/lib/ai-agent/chat-workflow-handler";
import { runAgentWorkflowFromUtterance } from "@/lib/ai-agent/run-agent-workflow-utterance";
import { Ai4TeamVoiceControls } from "@/components/ai-agent/Ai4TeamVoiceControls";
import { Ai4tChatWatermark } from "@/components/ai/Ai4tChatWatermark";
import { Ai4tChatComposer } from "@/components/ai/Ai4tChatComposer";
import { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";
import type { AgentIntent, AgentRunRow, PlanWeekSessionInput } from "@/lib/ai-agent/types";
import { AiAgentProposalCard } from "./AiAgentProposalCard";
import { AiAgentOutcomeLinks } from "./AiAgentOutcomeLinks";
import { cn } from "@/lib/utils";

type AiRequestKind = "training_plan" | "admin_digest";

interface TrainingActivityOption {
  id: string;
  title: string;
  starts_at: string;
  team_id: string | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface AiAgentWorkspaceProps {
  compact?: boolean;
  onRunCompleted?: () => void;
  conversationId?: string | null;
  toolActivities?: TrainingActivityOption[];
  toolBusy?: AiRequestKind | null;
  toolOutput?: string;
  onGeneratePlan?: () => void;
  onGenerateDigest?: () => void;
  onTriggerAutomationDigest?: () => void;
  dashboardRolePath?: string;
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function emptySession(): PlanWeekSessionInput {
  return { title: "Training", starts_at: "", ends_at: "", location: null };
}

export function AiAgentWorkspace({
  compact = false,
  onRunCompleted,
  conversationId = null,
  toolActivities: toolActivitiesProp,
  toolBusy = null,
  toolOutput = "",
  onGeneratePlan,
  onGenerateDigest,
  onTriggerAutomationDigest,
  dashboardRolePath = "player",
}: AiAgentWorkspaceProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const p = t.coTrainerPage.agent;
  const {
    clubId,
    language,
    canManageSchedule,
    canManageMembers,
    initialIntent,
    clearInitialIntent,
    pendingProposal,
    workflowBusy,
    propose,
    confirmProposal,
    dismissProposal,
    applyProposal,
  } = useAiAgent();

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [localActivities, setLocalActivities] = useState<TrainingActivityOption[]>([]);
  const [activeIntent, setActiveIntent] = useState<AgentIntent | null>(null);

  const [createTeamId, setCreateTeamId] = useState("");
  const [createTitle, setCreateTitle] = useState("Training");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createLocation, setCreateLocation] = useState("");

  const [cancelActivityId, setCancelActivityId] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [memberTeam, setMemberTeam] = useState("");
  const [memberPosition, setMemberPosition] = useState("");

  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyContent, setNotifyContent] = useState("");

  const [planTeamId, setPlanTeamId] = useState("");
  const [planLocation, setPlanLocation] = useState("");
  const [planSessions, setPlanSessions] = useState<PlanWeekSessionInput[]>([
    emptySession(),
    emptySession(),
    emptySession(),
  ]);
  const [planNotify, setPlanNotify] = useState(false);
  const [planNotifyTitle, setPlanNotifyTitle] = useState("");
  const [planNotifyContent, setPlanNotifyContent] = useState("");
  const [outcomeLinks, setOutcomeLinks] = useState<{ label: string; href: string }[]>([]);
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [pendingNlWorkflow, setPendingNlWorkflow] = useState<PendingWorkflowState | null>(null);
  const [nlClarifyQuestion, setNlClarifyQuestion] = useState<string | null>(null);

  const aiVoice = useAi4TeamVoice(language);

  const visibleIntents = useMemo(
    () => visibleIntentsForUser({ canManageSchedule, canManageMembers }),
    [canManageSchedule, canManageMembers],
  );

  /** Public club modal is always light; shadcn `bg-background` follows app dark mode. */
  const compactFieldClass = compact
    ? "border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 shadow-none focus-visible:ring-[color:var(--club-primary)] focus-visible:ring-offset-0 [color-scheme:light]"
    : "";
  const compactLabelClass = compact ? "text-neutral-700" : "";
  const compactSelectContentClass = compact
    ? "z-[140] border-neutral-200 bg-white text-neutral-900 shadow-lg"
    : "";
  const compactSelectItemClass = compact ? "focus:bg-neutral-100 focus:text-neutral-900" : "";

  const trainingOptions = useMemo(() => {
    const source = toolActivitiesProp ?? localActivities;
    return source
      .filter((a) => a.starts_at)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [toolActivitiesProp, localActivities]);

  useEffect(() => {
    if (initialIntent && visibleIntents.includes(initialIntent)) {
      setActiveIntent(initialIntent);
      clearInitialIntent();
    }
  }, [initialIntent, visibleIntents, clearInitialIntent]);

  useEffect(() => {
    if (!clubId || !canManageSchedule) {
      setTeams([]);
      return;
    }
    let cancelled = false;
    setTeamsLoading(true);
    void supabase
      .from("teams")
      .select("id, name")
      .eq("club_id", clubId)
      .order("name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[AiAgentWorkspace] teams:", error.message);
          setTeams([]);
        } else {
          setTeams((data as TeamOption[]) ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setTeamsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, canManageSchedule]);

  useEffect(() => {
    if (toolActivitiesProp || !clubId || !canManageSchedule) return;
    let cancelled = false;
    void supabase
      .from("activities")
      .select("id, title, starts_at, team_id, type")
      .eq("club_id", clubId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(40)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const rows = ((data ?? []) as Array<TrainingActivityOption & { type?: string }>).filter(
          (a) => !a.type || a.type === "training",
        );
        setLocalActivities(rows);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, canManageSchedule, toolActivitiesProp]);

  const intentLabel = useCallback(
    (intent: AgentIntent): string => {
      switch (intent) {
        case "create_training":
          return p.intentCreateTraining;
        case "cancel_training":
          return p.intentCancelTraining;
        case "cancel_training_with_parent_notice":
          return p.intentCancelTrainingNotifyParents;
        case "add_member_draft":
          return p.intentAddMemberDraft;
        case "plan_training_week":
          return p.intentPlanWeek;
        case "duplicate_training_week":
          return p.intentDuplicateWeek;
        case "notify_trainers":
        case "send_club_announcement":
          return p.intentNotifyTrainers;
        default:
          return intent;
      }
    },
    [p],
  );

  const intentDescription = useCallback(
    (intent: AgentIntent): string => {
      switch (intent) {
        case "create_training":
          return p.intentCreateTrainingDesc;
        case "cancel_training":
          return p.intentCancelTrainingDesc;
        case "cancel_training_with_parent_notice":
          return p.intentCancelTrainingNotifyParentsDesc;
        case "add_member_draft":
          return p.intentAddMemberDraftDesc;
        case "plan_training_week":
          return p.intentPlanWeekDesc;
        case "duplicate_training_week":
          return p.intentDuplicateWeekDesc;
        case "notify_trainers":
        case "send_club_announcement":
          return p.intentNotifyTrainersDesc;
        default:
          return "";
      }
    },
    [p],
  );

  const handleAgentUtterance = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || nlLoading || workflowBusy || !clubId) return;

      setNlLoading(true);
      aiVoice.stopSpeaking();
      try {
        const result = await runAgentWorkflowFromUtterance({
          clubId,
          message: msg,
          language,
          pendingWorkflow: pendingNlWorkflow,
          canUseAgent: visibleIntents.length > 0,
          pageContext: { source: compact ? "public-club-agent" : "co-trainer-agent" },
          conversationId,
        });

        if (result.type === "skip") {
          toast({
            title: p.agentUtteranceNotAction,
            description: p.agentUtteranceUseChatHint,
          });
          return;
        }

        setNlInput("");

        if (result.type === "clarify") {
          setPendingNlWorkflow(result.pending);
          setNlClarifyQuestion(result.question);
          toast({ title: result.question });
          aiVoice.speak(result.question);
          return;
        }

        setPendingNlWorkflow(null);
        setNlClarifyQuestion(null);

        if (result.type === "denied") {
          const deniedMsg = formatTeamAccessDeniedMessage(result.body, language);
          toast({
            title: p.teamAccessDeniedTitle,
            description: deniedMsg,
            variant: "destructive",
          });
          aiVoice.speak(deniedMsg);
          return;
        }

        if (result.type === "proposal") {
          applyProposal(result.proposal);
          aiVoice.speak(
            language === "de"
              ? "Vorschlag ist bereit. Bitte prüfen und bestätigen."
              : "Proposal is ready. Please review and confirm.",
          );
          return;
        }

        if (result.type === "error") {
          toast({
            title: p.proposeFailed,
            description: result.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: p.nlInterpretFailed,
          description: p.agentWorkflowExamples,
        });
      } finally {
        setNlLoading(false);
      }
    },
    [
      nlLoading,
      workflowBusy,
      clubId,
      language,
      pendingNlWorkflow,
      visibleIntents.length,
      compact,
      conversationId,
      aiVoice,
      applyProposal,
      toast,
      p,
    ],
  );

  const handleAgentVoiceCommand = useCallback(
    async (transcript: string) => {
      await handleAgentUtterance(transcript);
    },
    [handleAgentUtterance],
  );

  const handleNlSend = useCallback(
    async (text?: string) => {
      await handleAgentUtterance(text ?? nlInput);
    },
    [handleAgentUtterance, nlInput],
  );

  const handlePropose = async (intent: AgentIntent) => {
    if (!clubId) return;
    try {
      let params: Record<string, unknown> = {};

      if (intent === "create_training") {
        const starts = localInputToIso(createStart);
        const ends = localInputToIso(createEnd);
        if (!createTitle.trim() || !starts || !ends) {
          toast({ title: p.validationRequired, variant: "destructive" });
          return;
        }
        params = {
          team_id: createTeamId || null,
          title: createTitle.trim(),
          starts_at: starts,
          ends_at: ends,
          location: createLocation.trim() || null,
        };
      } else if (intent === "cancel_training" || intent === "cancel_training_with_parent_notice") {
        if (!cancelActivityId) {
          toast({ title: p.validationSelectTraining, variant: "destructive" });
          return;
        }
        if (intent === "cancel_training_with_parent_notice" && !cancelReason.trim()) {
          toast({ title: p.validationCancelReasonRequired, variant: "destructive" });
          return;
        }
        const picked = trainingOptions.find((x) => x.id === cancelActivityId);
        const teamName = picked?.team_id ? teams.find((t) => t.id === picked.team_id)?.name ?? null : null;
        params = {
          activity_id: cancelActivityId,
          activity_title: picked?.title ?? null,
          starts_at: picked?.starts_at ?? null,
          team_name: teamName,
          reason: cancelReason.trim() || null,
        };
      } else if (intent === "add_member_draft") {
        if (!memberEmail.trim()) {
          toast({ title: p.validationMemberEmail, variant: "destructive" });
          return;
        }
        params = {
          email: memberEmail.trim(),
          name: memberName.trim() || null,
          role: memberRole,
          team: memberTeam.trim() || null,
          position: memberPosition.trim() || null,
        };
      } else if (intent === "notify_trainers") {
        if (!notifyTitle.trim() || !notifyContent.trim()) {
          toast({ title: p.validationAnnouncement, variant: "destructive" });
          return;
        }
        params = { title: notifyTitle.trim(), content: notifyContent.trim() };
      } else if (intent === "duplicate_training_week") {
        params = {
          team_id: planTeamId || null,
          days_shift: 7,
        };
      } else if (intent === "plan_training_week") {
        const sessions = planSessions
          .map((s) => ({
            title: s.title.trim() || "Training",
            starts_at: localInputToIso(s.starts_at),
            ends_at: localInputToIso(s.ends_at),
            location: s.location?.trim() || planLocation.trim() || null,
            team_id: planTeamId || null,
          }))
          .filter((s) => s.starts_at && s.ends_at);
        if (sessions.length === 0) {
          toast({ title: p.validationPlanWeekSessions, variant: "destructive" });
          return;
        }
        params = {
          team_id: planTeamId || null,
          location: planLocation.trim() || null,
          sessions,
        };
        if (planNotify && planNotifyTitle.trim() && planNotifyContent.trim()) {
          params.announcement = {
            title: planNotifyTitle.trim(),
            content: planNotifyContent.trim(),
          };
        }
      }

      await propose(intent, params, {
        pageContext: { source: compact ? "header-sheet" : "co-trainer" },
        conversationId,
      });
    } catch (e) {
      toast({
        title: p.proposeFailed,
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async () => {
    try {
      const result = await confirmProposal();
      toast({ title: p.executeSuccess });
      setOutcomeLinks(result?.result?.links ?? []);
      setPendingNlWorkflow(null);
      setNlClarifyQuestion(null);
      onRunCompleted?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/not pending|expired/i.test(message)) {
        dismissProposal();
      }
      toast({
        title: p.executeFailed,
        description: message,
        variant: "destructive",
      });
    }
  };

  if (!clubId) {
    return <p className="text-sm text-muted-foreground text-center py-12">{t.ai.selectClub}</p>;
  }

  if (visibleIntents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12 rounded-2xl border border-border/60 bg-card/40 p-6">
        {p.trainerOnly}
      </p>
    );
  }

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", compact && "h-full")}>
      {compact ? <Ai4tChatWatermark className="top-[4.5rem]" /> : null}

      <div className={cn("relative z-10 min-h-0 flex-1 overflow-y-auto", compact ? "space-y-4 pb-2 pt-4" : "space-y-6")}>
      {!compact && onGeneratePlan && onGenerateDigest && onTriggerAutomationDigest ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
          <div className="text-sm font-semibold text-foreground">{p.sectionQuickTitle}</div>
          <p className="text-[11px] text-muted-foreground mt-1">{p.sectionQuickDesc}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <ClipboardList className="w-4 h-4" /> {t.ai.coTrainer}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.ai.coTrainerDesc}</p>
              <Button
                className="mt-3 bg-gradient-gold-static text-primary-foreground font-semibold"
                onClick={onGeneratePlan}
                disabled={toolBusy !== null}
              >
                {toolBusy === "training_plan" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {t.ai.generatePlan}
              </Button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <ScrollText className="w-4 h-4" /> {t.ai.coAImin}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.ai.coAIminDesc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="bg-gradient-gold-static text-primary-foreground font-semibold"
                  onClick={onGenerateDigest}
                  disabled={toolBusy !== null}
                >
                  {toolBusy === "admin_digest" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {t.ai.generateDigest}
                </Button>
                <Button variant="outline" onClick={onTriggerAutomationDigest} disabled={toolBusy !== null}>
                  {p.queueDigestAutomation}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "space-y-4 rounded-2xl border p-4",
          compact
            ? "border-neutral-200/80 bg-white/80 shadow-sm backdrop-blur-sm"
            : "border-border/60 bg-card/40 backdrop-blur-2xl",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={cn("text-sm font-semibold", compact ? "text-neutral-900" : "text-foreground")}>
              {p.sectionWorkflowsTitle}
            </div>
            <p className={cn("mt-1 text-xs leading-snug", compact ? "text-neutral-600" : "text-muted-foreground")}>
              {p.sectionWorkflowsDesc}
            </p>
            {compact ? (
              <p className="mt-1.5 text-[11px] leading-snug text-neutral-500">{t.coTrainerPage.voice.hint}</p>
            ) : null}
          </div>
          {!compact ? (
            <div className="flex shrink-0 items-center gap-2">
              {nlLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : null}
              <Ai4TeamVoiceControls
                disabled={workflowBusy || nlLoading}
                voice={aiVoice}
                onVoiceCommand={(transcript) => void handleAgentVoiceCommand(transcript)}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2" role="list" aria-label={p.sectionWorkflowsTitle}>
          {visibleIntents.map((intent) => {
            const Icon = AGENT_INTENT_META[intent].icon;
            const isActive = activeIntent === intent;
            return (
              <button
                key={intent}
                type="button"
                role="listitem"
                aria-pressed={isActive}
                onClick={() => setActiveIntent(isActive ? null : intent)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  compact
                    ? isActive
                      ? "border-[color:var(--club-primary)] bg-white shadow-sm ring-1 ring-[color:var(--club-primary)]/15"
                      : "border-neutral-200/90 bg-white/90 hover:border-neutral-300 hover:bg-white"
                    : isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-[color:var(--club-primary)]/10 text-[color:var(--club-primary)]"
                      : compact
                        ? "bg-neutral-100 text-neutral-700"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className={cn("text-sm font-semibold", compact ? "text-neutral-900" : "text-foreground")}>
                    {intentLabel(intent)}
                  </div>
                  <p className={cn("mt-0.5 text-xs leading-snug", compact ? "text-neutral-600" : "text-muted-foreground")}>
                    {intentDescription(intent)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {activeIntent === "create_training" ? (
          <div
            className={cn(
              "grid gap-3 rounded-xl border p-4 sm:grid-cols-2",
              compact ? "border-neutral-200/80 bg-white/95" : "border-border/50 bg-background/30",
            )}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldTitle}</Label>
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldTeam}</Label>
              <Select value={createTeamId || "__none__"} onValueChange={(v) => setCreateTeamId(v === "__none__" ? "" : v)}>
                <SelectTrigger className={cn("h-9", compactFieldClass)}>
                  <SelectValue placeholder={p.fieldTeamOptional} />
                </SelectTrigger>
                <SelectContent className={compactSelectContentClass}>
                  <SelectItem className={compactSelectItemClass} value="__none__">{p.fieldTeamOptional}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem className={compactSelectItemClass} key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamsLoading ? <span className="text-[10px] text-muted-foreground">{p.loadingTeams}</span> : null}
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldLocation}</Label>
              <Input
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                className={cn("h-9", compactFieldClass)}
                placeholder={p.fieldLocationPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldStarts}</Label>
              <Input type="datetime-local" value={createStart} onChange={(e) => setCreateStart(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldEnds}</Label>
              <Input type="datetime-local" value={createEnd} onChange={(e) => setCreateEnd(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                disabled={workflowBusy}
                className="bg-gradient-gold-static text-primary-foreground"
                onClick={() => void handlePropose("create_training")}
              >
                {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {p.reviewCreateTraining}
              </Button>
            </div>
          </div>
        ) : null}

        {(activeIntent === "cancel_training" || activeIntent === "cancel_training_with_parent_notice") ? (
          <div
            className={cn(
              "grid gap-3 rounded-xl border p-4",
              compact ? "border-neutral-200/80 bg-white/95" : "border-border/50 bg-background/30",
            )}
          >
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldTrainingSession}</Label>
              <Select value={cancelActivityId || undefined} onValueChange={setCancelActivityId}>
                <SelectTrigger className={cn("h-9", compactFieldClass)}>
                  <SelectValue placeholder={p.fieldTrainingPlaceholder} />
                </SelectTrigger>
                <SelectContent className={compactSelectContentClass}>
                  {trainingOptions.length === 0 ? (
                    <SelectItem className={compactSelectItemClass} value="__empty__" disabled>
                      {p.noUpcomingTrainings}
                    </SelectItem>
                  ) : (
                    trainingOptions.map((a) => {
                      const teamName = a.team_id ? teams.find((t) => t.id === a.team_id)?.name : null;
                      const when = new Date(a.starts_at).toLocaleString(language === "de" ? "de-DE" : "en-GB");
                      const label = [teamName, a.title, when].filter(Boolean).join(" · ");
                      return (
                      <SelectItem className={compactSelectItemClass} key={a.id} value={a.id}>
                        {label}
                      </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>
                {activeIntent === "cancel_training_with_parent_notice" ? p.fieldCancelReasonRequired : p.fieldCancelReason}
              </Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className={cn("text-sm", compactFieldClass)}
                placeholder={p.fieldCancelReasonPlaceholder}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={workflowBusy || trainingOptions.length === 0}
              onClick={() => void handlePropose(activeIntent!)}
            >
              {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {activeIntent === "cancel_training_with_parent_notice"
                ? p.reviewCancelTrainingNotifyParents
                : p.reviewCancelTraining}
            </Button>
          </div>
        ) : null}

        {activeIntent === "add_member_draft" ? (
          <div
            className={cn(
              "grid gap-3 rounded-xl border p-4 sm:grid-cols-2",
              compact ? "border-neutral-200/80 bg-white/95" : "border-border/50 bg-background/30",
            )}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldMemberEmail}</Label>
              <Input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldMemberName}</Label>
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldMemberRole}</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger className={cn("h-9", compactFieldClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={compactSelectContentClass}>
                  <SelectItem className={compactSelectItemClass} value="member">{p.roleMember}</SelectItem>
                  <SelectItem className={compactSelectItemClass} value="player">{p.rolePlayer}</SelectItem>
                  <SelectItem className={compactSelectItemClass} value="trainer">{p.roleTrainer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldMemberTeam}</Label>
              <Input value={memberTeam} onChange={(e) => setMemberTeam(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldMemberPosition}</Label>
              <Input value={memberPosition} onChange={(e) => setMemberPosition(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                disabled={workflowBusy}
                className="bg-gradient-gold-static text-primary-foreground"
                onClick={() => void handlePropose("add_member_draft")}
              >
                {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {p.reviewAddMemberDraft}
              </Button>
            </div>
          </div>
        ) : null}

        {activeIntent === "notify_trainers" ? (
          <div
            className={cn(
              "grid gap-3 rounded-xl border p-4",
              compact ? "border-neutral-200/80 bg-white/95" : "border-border/50 bg-background/30",
            )}
          >
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldAnnouncementTitle}</Label>
              <Input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} className={cn("h-9", compactFieldClass)} />
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldAnnouncementContent}</Label>
              <Textarea
                value={notifyContent}
                onChange={(e) => setNotifyContent(e.target.value)}
                rows={4}
                className={cn("text-sm", compactFieldClass)}
              />
            </div>
            <Button
              type="button"
              disabled={workflowBusy}
              className="bg-gradient-gold-static text-primary-foreground"
              onClick={() => void handlePropose("notify_trainers")}
            >
              {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {p.reviewNotifyTrainers}
            </Button>
          </div>
        ) : null}

        {activeIntent === "duplicate_training_week" ? (
          <div
            className={cn(
              "grid gap-3 rounded-xl border p-4",
              compact ? "border-neutral-200/80 bg-white/95" : "border-border/50 bg-background/30",
            )}
          >
            <p className="text-xs text-muted-foreground">{p.duplicateWeekHint}</p>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", compactLabelClass)}>{p.fieldTeam}</Label>
              <Select value={planTeamId || "__none__"} onValueChange={(v) => setPlanTeamId(v === "__none__" ? "" : v)}>
                <SelectTrigger className={cn("h-9", compactFieldClass)}>
                  <SelectValue placeholder={p.fieldTeamOptional} />
                </SelectTrigger>
                <SelectContent className={compactSelectContentClass}>
                  <SelectItem className={compactSelectItemClass} value="__none__">{p.fieldTeamOptional}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem className={compactSelectItemClass} key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={workflowBusy}
              className="bg-gradient-gold-static text-primary-foreground"
              onClick={() => void handlePropose("duplicate_training_week")}
            >
              {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {p.reviewDuplicateWeek}
            </Button>
          </div>
        ) : null}

        {activeIntent === "plan_training_week" ? (
          <div
            className={cn(
              "space-y-4 rounded-xl border p-4",
              compact ? "border-neutral-200/80 bg-white/95" : "border-border/50 bg-background/30",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={cn("text-xs", compactLabelClass)}>{p.fieldTeam}</Label>
                <Select value={planTeamId || "__none__"} onValueChange={(v) => setPlanTeamId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className={cn("h-9", compactFieldClass)}>
                    <SelectValue placeholder={p.fieldTeamOptional} />
                  </SelectTrigger>
                  <SelectContent className={compactSelectContentClass}>
                    <SelectItem className={compactSelectItemClass} value="__none__">{p.fieldTeamOptional}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem className={compactSelectItemClass} key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={cn("text-xs", compactLabelClass)}>{p.fieldLocation}</Label>
                <Input value={planLocation} onChange={(e) => setPlanLocation(e.target.value)} className={cn("h-9", compactFieldClass)} />
              </div>
            </div>

            {planSessions.map((session, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-2 rounded-lg border border-border/40 p-3">
                <div className="sm:col-span-2 text-[11px] font-medium text-muted-foreground">
                  {p.sessionLabel.replace("{n}", String(idx + 1))}
                </div>
                <Input
                  value={session.title}
                  onChange={(e) => {
                    const next = [...planSessions];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setPlanSessions(next);
                  }}
                  placeholder={p.fieldTitle}
                  className={cn("h-9 sm:col-span-2", compactFieldClass)}
                />
                <Input
                  type="datetime-local"
                  value={session.starts_at}
                  onChange={(e) => {
                    const next = [...planSessions];
                    next[idx] = { ...next[idx], starts_at: e.target.value };
                    setPlanSessions(next);
                  }}
                  className={cn("h-9", compactFieldClass)}
                />
                <Input
                  type="datetime-local"
                  value={session.ends_at}
                  onChange={(e) => {
                    const next = [...planSessions];
                    next[idx] = { ...next[idx], ends_at: e.target.value };
                    setPlanSessions(next);
                  }}
                  className={cn("h-9", compactFieldClass)}
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPlanSessions((prev) => [...prev, emptySession()])}
            >
              {p.addSession}
            </Button>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="plan-notify" checked={planNotify} onCheckedChange={(v) => setPlanNotify(v === true)} />
              <Label htmlFor="plan-notify" className={cn("text-xs cursor-pointer", compactLabelClass)}>
                {p.planWeekNotifyLabel}
              </Label>
            </div>
            {planNotify ? (
              <div className="grid gap-2 pl-1">
                <Input
                  value={planNotifyTitle}
                  onChange={(e) => setPlanNotifyTitle(e.target.value)}
                  placeholder={p.fieldAnnouncementTitle}
                  className={cn("h-9", compactFieldClass)}
                />
                <Textarea
                  value={planNotifyContent}
                  onChange={(e) => setPlanNotifyContent(e.target.value)}
                  rows={3}
                  placeholder={p.fieldAnnouncementContent}
                  className={cn("text-sm", compactFieldClass)}
                />
              </div>
            ) : null}

            <Button
              type="button"
              disabled={workflowBusy}
              className="bg-gradient-gold-static text-primary-foreground"
              onClick={() => void handlePropose("plan_training_week")}
            >
              {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {p.reviewPlanWeek}
            </Button>
          </div>
        ) : null}
      </div>

      {outcomeLinks.length > 0 ? <AiAgentOutcomeLinks links={outcomeLinks} /> : null}

      {!compact && pendingProposal ? (
        <AiAgentProposalCard
          proposal={pendingProposal}
          busy={workflowBusy}
          variant="default"
          clubId={clubId}
          onConfirm={() => void handleConfirm()}
          onDismiss={() => {
            dismissProposal();
            setOutcomeLinks([]);
            setPendingNlWorkflow(null);
            setNlClarifyQuestion(null);
          }}
        />
      ) : null}

      {!compact ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 space-y-2">
          <div>
            <div className="text-sm font-semibold text-foreground">{p.agentComposerTitle}</div>
            <p className="mt-1 text-xs text-muted-foreground">{p.agentComposerHint}</p>
          </div>
          {nlClarifyQuestion ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-100">
              {nlClarifyQuestion}
            </p>
          ) : null}
          <Ai4tChatComposer
            value={nlInput}
            onChange={setNlInput}
            onSend={() => void handleNlSend()}
            isLoading={nlLoading}
            disabled={workflowBusy}
            voice={aiVoice}
            onVoiceCommand={(transcript) => void handleNlSend(transcript)}
            sendAriaLabel={t.coTrainerPage.tabAgent}
            className="rounded-xl border border-border/60 bg-background/50"
          />
        </div>
      ) : null}

      {!compact ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/matches"
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4 flex items-center justify-between gap-2 hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold">{t.coTrainerPage.linkMatchAnalysis}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.coTrainerPage.linkMatchAnalysisDesc}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
            <Link
              to={`/dashboard/${dashboardRolePath}`}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4 flex items-center justify-between gap-2 hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="text-sm font-semibold">{t.coTrainerPage.linkStats}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.coTrainerPage.linkStatsDesc}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          </div>

          {toolOutput ? (
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <Shield className="w-4 h-4" /> {t.ai.output}
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed">{toolOutput}</pre>
            </div>
          ) : null}
        </>
      ) : null}
      </div>

      {compact ? (
        <div className="relative z-10 shrink-0 space-y-2 border-t border-neutral-200/80 bg-white/95 px-1 pt-2">
          {pendingProposal ? (
            <AiAgentProposalCard
              proposal={pendingProposal}
              busy={workflowBusy}
              variant="light"
              clubId={clubId}
              onConfirm={() => void handleConfirm()}
              onDismiss={() => {
                dismissProposal();
                setOutcomeLinks([]);
                setPendingNlWorkflow(null);
                setNlClarifyQuestion(null);
              }}
            />
          ) : null}
          {nlClarifyQuestion ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-950">
              {nlClarifyQuestion}
            </p>
          ) : null}
          <Ai4tChatComposer
            value={nlInput}
            onChange={setNlInput}
            onSend={() => void handleNlSend()}
            isLoading={nlLoading}
            disabled={workflowBusy}
            voice={aiVoice}
            onVoiceCommand={(transcript) => void handleNlSend(transcript)}
            sendAriaLabel={t.coTrainerPage.tabAgent}
            className="rounded-b-2xl border-t border-neutral-200/80 bg-white/90"
          />
        </div>
      ) : null}
    </div>
  );
}

export type { AgentRunRow };
