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
import { interpretAgentFromMessage } from "@/lib/ai-agent/api";
import { buildFormPatchFromParams, type VoiceFormPatch } from "@/lib/ai-agent/apply-voice-to-forms";
import { getBrowserTimezone } from "@/lib/ai-agent/voice-text";
import { Ai4TeamVoiceControls } from "@/components/ai-agent/Ai4TeamVoiceControls";
import { useAi4TeamVoice } from "@/hooks/use-ai4team-voice";
import type { AgentIntent, AgentRunRow, PlanWeekSessionInput } from "@/lib/ai-agent/types";
import { AiAgentProposalCard } from "./AiAgentProposalCard";

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
  const [voiceInterpreting, setVoiceInterpreting] = useState(false);

  const aiVoice = useAi4TeamVoice(language);

  const visibleIntents = useMemo(
    () => visibleIntentsForUser({ canManageSchedule, canManageMembers }),
    [canManageSchedule, canManageMembers],
  );

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
        case "add_member_draft":
          return p.intentAddMemberDraft;
        case "plan_training_week":
          return p.intentPlanWeek;
        case "notify_trainers":
        case "send_club_announcement":
          return p.intentNotifyTrainers;
        default:
          return intent;
      }
    },
    [p],
  );

  const applyFormPatch = useCallback((patch: VoiceFormPatch) => {
    setActiveIntent(patch.intent);
    if (patch.intent === "create_training") {
      setCreateTeamId(patch.teamId);
      setCreateTitle(patch.title);
      setCreateStart(patch.startLocal);
      setCreateEnd(patch.endLocal);
      setCreateLocation(patch.location);
    } else if (patch.intent === "cancel_training") {
      setCancelActivityId(patch.activityId);
      setCancelReason(patch.reason);
    } else if (patch.intent === "add_member_draft") {
      setMemberEmail(patch.email);
      setMemberName(patch.name);
      setMemberRole(patch.role);
      setMemberTeam(patch.team);
      setMemberPosition(patch.position);
    } else if (patch.intent === "notify_trainers") {
      setNotifyTitle(patch.title);
      setNotifyContent(patch.content);
    } else if (patch.intent === "plan_training_week") {
      setPlanTeamId(patch.teamId);
      setPlanLocation(patch.location);
      setPlanSessions(patch.sessions);
      setPlanNotify(patch.notify);
      setPlanNotifyTitle(patch.notifyTitle);
      setPlanNotifyContent(patch.notifyContent);
    }
  }, []);

  const handleAgentVoiceCommand = useCallback(
    async (transcript: string) => {
      if (!clubId || !transcript.trim()) return;
      setVoiceInterpreting(true);
      try {
        const interpreted = await interpretAgentFromMessage({
          clubId,
          message: transcript.trim(),
          language,
          timezone: getBrowserTimezone(),
          pageContext: { source: compact ? "header-sheet" : "co-trainer-agent" },
        });
        if (!interpreted) {
          toast({ title: p.voiceNotWorkflow, variant: "destructive" });
          aiVoice.speak(p.voiceNotWorkflow);
          return;
        }
        if (!visibleIntents.includes(interpreted.intent)) {
          toast({ title: p.voiceNoPermission, variant: "destructive" });
          return;
        }
        const patch = buildFormPatchFromParams(interpreted.intent, interpreted.params);
        if (!patch) {
          toast({ title: p.voiceNotWorkflow, variant: "destructive" });
          return;
        }
        applyFormPatch(patch);
        toast({ title: p.voiceFormFilled, description: intentLabel(interpreted.intent) });
        aiVoice.speak(p.voiceFormFilled);
      } catch (e) {
        toast({
          title: p.voiceInterpretError,
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      } finally {
        setVoiceInterpreting(false);
      }
    },
    [
      clubId,
      language,
      compact,
      visibleIntents,
      applyFormPatch,
      toast,
      p,
      aiVoice,
      intentLabel,
    ],
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
      } else if (intent === "cancel_training") {
        if (!cancelActivityId) {
          toast({ title: p.validationSelectTraining, variant: "destructive" });
          return;
        }
        const picked = trainingOptions.find((x) => x.id === cancelActivityId);
        params = {
          activity_id: cancelActivityId,
          reason: cancelReason.trim() || null,
          title: picked?.title ?? cancelActivityId,
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
      await confirmProposal();
      toast({ title: p.executeSuccess });
      onRunCompleted?.();
    } catch (e) {
      toast({
        title: p.executeFailed,
        description: e instanceof Error ? e.message : String(e),
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
    <div className="space-y-6">
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

      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{p.sectionWorkflowsTitle}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{p.sectionWorkflowsDesc}</p>
            {(aiVoice.speechSupported || aiVoice.ttsSupported) ? (
              <p className="text-[10px] text-muted-foreground mt-1.5">{p.voiceAgentHint}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {voiceInterpreting ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            ) : null}
            <Ai4TeamVoiceControls
              disabled={workflowBusy || voiceInterpreting}
              voice={aiVoice}
              onVoiceCommand={(transcript) => void handleAgentVoiceCommand(transcript)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleIntents.map((intent) => {
            const Icon = AGENT_INTENT_META[intent].icon;
            return (
              <Button
                key={intent}
                type="button"
                variant={activeIntent === intent ? "default" : "outline"}
                size="sm"
                className="rounded-xl gap-1.5"
                onClick={() => setActiveIntent(intent)}
              >
                <Icon className="w-3.5 h-3.5" />
                {intentLabel(intent)}
              </Button>
            );
          })}
        </div>

        {activeIntent === "create_training" ? (
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-background/30 p-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{p.fieldTitle}</Label>
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldTeam}</Label>
              <Select value={createTeamId || "__none__"} onValueChange={(v) => setCreateTeamId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={p.fieldTeamOptional} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{p.fieldTeamOptional}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamsLoading ? <span className="text-[10px] text-muted-foreground">{p.loadingTeams}</span> : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldLocation}</Label>
              <Input
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                className="h-9"
                placeholder={p.fieldLocationPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldStarts}</Label>
              <Input type="datetime-local" value={createStart} onChange={(e) => setCreateStart(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldEnds}</Label>
              <Input type="datetime-local" value={createEnd} onChange={(e) => setCreateEnd(e.target.value)} className="h-9" />
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

        {activeIntent === "cancel_training" ? (
          <div className="grid gap-3 rounded-xl border border-border/50 bg-background/30 p-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldTrainingSession}</Label>
              <Select value={cancelActivityId || undefined} onValueChange={setCancelActivityId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={p.fieldTrainingPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {trainingOptions.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {p.noUpcomingTrainings}
                    </SelectItem>
                  ) : (
                    trainingOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title} · {new Date(a.starts_at).toLocaleString(language === "de" ? "de-DE" : "en-GB")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldCancelReason}</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="text-sm"
                placeholder={p.fieldCancelReasonPlaceholder}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={workflowBusy || trainingOptions.length === 0}
              onClick={() => void handlePropose("cancel_training")}
            >
              {workflowBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {p.reviewCancelTraining}
            </Button>
          </div>
        ) : null}

        {activeIntent === "add_member_draft" ? (
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-background/30 p-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{p.fieldMemberEmail}</Label>
              <Input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldMemberName}</Label>
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldMemberRole}</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{p.roleMember}</SelectItem>
                  <SelectItem value="player">{p.rolePlayer}</SelectItem>
                  <SelectItem value="trainer">{p.roleTrainer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldMemberTeam}</Label>
              <Input value={memberTeam} onChange={(e) => setMemberTeam(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{p.fieldMemberPosition}</Label>
              <Input value={memberPosition} onChange={(e) => setMemberPosition(e.target.value)} className="h-9" />
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
          <div className="grid gap-3 rounded-xl border border-border/50 bg-background/30 p-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldAnnouncementTitle}</Label>
              <Input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.fieldAnnouncementContent}</Label>
              <Textarea
                value={notifyContent}
                onChange={(e) => setNotifyContent(e.target.value)}
                rows={4}
                className="text-sm"
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

        {activeIntent === "plan_training_week" ? (
          <div className="space-y-4 rounded-xl border border-border/50 bg-background/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{p.fieldTeam}</Label>
                <Select value={planTeamId || "__none__"} onValueChange={(v) => setPlanTeamId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={p.fieldTeamOptional} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{p.fieldTeamOptional}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{p.fieldLocation}</Label>
                <Input value={planLocation} onChange={(e) => setPlanLocation(e.target.value)} className="h-9" />
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
                  className="h-9 sm:col-span-2"
                />
                <Input
                  type="datetime-local"
                  value={session.starts_at}
                  onChange={(e) => {
                    const next = [...planSessions];
                    next[idx] = { ...next[idx], starts_at: e.target.value };
                    setPlanSessions(next);
                  }}
                  className="h-9"
                />
                <Input
                  type="datetime-local"
                  value={session.ends_at}
                  onChange={(e) => {
                    const next = [...planSessions];
                    next[idx] = { ...next[idx], ends_at: e.target.value };
                    setPlanSessions(next);
                  }}
                  className="h-9"
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
              <Label htmlFor="plan-notify" className="text-xs cursor-pointer">
                {p.planWeekNotifyLabel}
              </Label>
            </div>
            {planNotify ? (
              <div className="grid gap-2 pl-1">
                <Input
                  value={planNotifyTitle}
                  onChange={(e) => setPlanNotifyTitle(e.target.value)}
                  placeholder={p.fieldAnnouncementTitle}
                  className="h-9"
                />
                <Textarea
                  value={planNotifyContent}
                  onChange={(e) => setPlanNotifyContent(e.target.value)}
                  rows={3}
                  placeholder={p.fieldAnnouncementContent}
                  className="text-sm"
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

      {pendingProposal ? (
        <AiAgentProposalCard
          proposal={pendingProposal}
          busy={workflowBusy}
          onConfirm={() => void handleConfirm()}
          onDismiss={dismissProposal}
        />
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
  );
}

export type { AgentRunRow };
