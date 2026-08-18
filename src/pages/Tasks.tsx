import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Ai4TInlineLabel } from "@/components/ai/Ai4TBrand";
import { AiAgentHeaderButton } from "@/components/ai-agent/AiAgentHeaderButton";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { useRegisterAiAgentContext } from "@/hooks/use-register-ai-agent-context";
import { useUserTeamIds } from "@/hooks/use-user-team-ids";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import {
  createClubTask,
  deleteClubTask,
  updateClubTask,
  useClubTaskOptions,
  useClubTasks,
  type ClubTaskFilter,
} from "@/hooks/use-club-tasks";
import {
  CLUB_TASK_PRIORITIES,
  CLUB_TASK_STATUSES,
  type ClubTaskPriority,
  type ClubTaskRow,
  type ClubTaskStatus,
  isClubTaskOpen,
  isClubTaskOverdue,
} from "@/lib/club-task-models";
import { claimClubTask } from "@/lib/club-task-coordination-api";
import { isClaimableDuty, slotsLabel } from "@/lib/club-task-coordination";
import {
  ensureStarterTaskTemplates,
  listClubTaskTemplates,
  spawnClubTaskFromTemplate,
} from "@/lib/club-task-templates-api";
import type { ClubTaskTemplateRow } from "@/lib/club-task-templates";
import { starterSlotsForKey } from "@/lib/club-task-templates";
import { TaskChecklistPanel } from "@/components/tasks/task-checklist-panel";
import { Checkbox } from "@/components/ui/checkbox";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import {
  buildTaskAccessFromGateRole,
  canBrowseAllClubTasks,
} from "@/lib/club-task-access";
import { cn } from "@/lib/utils";

const UNASSIGNED = "__none__";

const TASK_PANEL_CLASS =
  "flex min-h-[min(72vh,680px)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-2xl";

function priorityBadgeClass(priority: ClubTaskPriority): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/15 text-red-400 ring-1 ring-red-500/25";
    case "high":
      return "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25";
    case "low":
      return "bg-muted/80 text-muted-foreground";
    default:
      return "bg-primary/10 text-primary";
  }
}

function statusBadgeClass(status: ClubTaskStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25";
    case "in_progress":
      return "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25";
    case "cancelled":
      return "bg-muted/80 text-muted-foreground";
    default:
      return "bg-muted/60 text-muted-foreground";
  }
}

export default function Tasks() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const gateRole = useModuleGateRole();
  const { teamIds: userTeamIds } = useUserTeamIds(clubId);
  const taskAccess = useMemo(
    () => buildTaskAccessFromGateRole(gateRole, user?.id ?? null, userTeamIds),
    [gateRole, user?.id, userTeamIds],
  );
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentPageContext = useMemo(() => ({ source: "tasks" as const }), []);
  useRegisterAiAgentContext(agentPageContext);

  const canSeeAllTasks = canBrowseAllClubTasks(taskAccess);
  const filterParam = (searchParams.get("filter") as ClubTaskFilter | null) ?? (canSeeAllTasks ? "all" : "mine");
  const filter: ClubTaskFilter =
    filterParam === "mine" || filterParam === "overdue"
      ? filterParam
      : canSeeAllTasks
        ? "all"
        : "mine";
  const selectedId = searchParams.get("id");

  const canManage = taskAccess.canManageTasks;
  const { tasks, loading, reload } = useClubTasks(clubId, filter, taskAccess);
  const { assignees, partners, teams } = useClubTaskOptions(clubId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClubTaskRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<ClubTaskRow | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ClubTaskPriority>("normal");
  const [status, setStatus] = useState<ClubTaskStatus>("open");
  const [dueAt, setDueAt] = useState("");
  const [teamId, setTeamId] = useState(UNASSIGNED);
  const [assigneeUserId, setAssigneeUserId] = useState(UNASSIGNED);
  const [partnerId, setPartnerId] = useState(UNASSIGNED);
  const [claimable, setClaimable] = useState(false);
  const [slotsTotal, setSlotsTotal] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [templates, setTemplates] = useState<ClubTaskTemplateRow[]>([]);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [spawnTemplateId, setSpawnTemplateId] = useState("");
  const [spawnTeamId, setSpawnTeamId] = useState(UNASSIGNED);

  const selectedTask = useMemo(
    () => tasks.find((row) => row.id === selectedId) ?? null,
    [selectedId, tasks],
  );

  const openCount = useMemo(
    () => tasks.filter((row) => isClubTaskOpen(row.status)).length,
    [tasks],
  );

  const assigneeLabelByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignees) map.set(row.user_id, row.label);
    return map;
  }, [assignees]);

  const partnerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of partners) map.set(row.id, row.name);
    return map;
  }, [partners]);

  const teamLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of teams) map.set(row.id, row.name);
    return map;
  }, [teams]);

  const resetForm = useCallback(() => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setPriority("normal");
    setStatus("open");
    setDueAt("");
    setTeamId(UNASSIGNED);
    setAssigneeUserId(UNASSIGNED);
    setPartnerId(UNASSIGNED);
    setClaimable(false);
    setSlotsTotal("");
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((task: ClubTaskRow) => {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setDueAt(task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd'T'HH:mm") : "");
    setTeamId(task.team_id ?? UNASSIGNED);
    setAssigneeUserId(task.assignee_user_id ?? UNASSIGNED);
    setPartnerId(task.partner_id ?? UNASSIGNED);
    setClaimable(Boolean(task.claimable));
    setSlotsTotal(task.slots_total != null ? String(task.slots_total) : "");
    setDialogOpen(true);
  }, []);

  const reloadTemplates = useCallback(async () => {
    if (!clubId || !canManage) {
      setTemplates([]);
      return;
    }
    const { data } = await listClubTaskTemplates(clubId);
    setTemplates(data);
  }, [canManage, clubId]);

  useEffect(() => {
    void reloadTemplates();
  }, [reloadTemplates]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && canManage) {
      openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [canManage, openCreate, searchParams, setSearchParams]);

  const setFilter = (next: ClubTaskFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params, { replace: true });
  };

  const selectTask = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("id", id);
    else params.delete("id");
    setSearchParams(params, { replace: true });
  };

  const parseSlotsTotal = (): number | null => {
    if (!claimable) return null;
    const n = Number(slotsTotal);
    if (!slotsTotal.trim() || !Number.isFinite(n) || n < 1) return null;
    return Math.min(20, Math.round(n));
  };

  const handleSave = async () => {
    if (!clubId || !title.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      team_id: teamId === UNASSIGNED ? null : teamId,
      assignee_user_id: claimable ? null : assigneeUserId === UNASSIGNED ? null : assigneeUserId,
      partner_id: partnerId === UNASSIGNED ? null : partnerId,
      claimable,
      slots_total: parseSlotsTotal(),
      source_type: claimable ? ("duty" as const) : ("manual" as const),
    };

    if (editing) {
      const { error } = await updateClubTask(editing.id, clubId, {
        ...payload,
        status,
      });
      setSaving(false);
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: t.tasksPage.taskUpdated });
    } else {
      const { error } = await createClubTask(clubId, payload);
      setSaving(false);
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: t.tasksPage.taskCreated });
    }

    setDialogOpen(false);
    resetForm();
    void reload();
  };

  const handleSeedTemplates = async () => {
    if (!clubId) return;
    setTemplateBusy(true);
    const result = await ensureStarterTaskTemplates(clubId);
    setTemplateBusy(false);
    if (result.error) {
      toast({ title: t.common.error, description: result.error.message, variant: "destructive" });
      return;
    }
    setTemplates(result.data);
    toast({
      title: result.created > 0 ? t.tasksPage.templatesSeeded : t.tasksPage.templatesAlreadySeeded,
    });
  };

  const handleSpawnTemplate = async () => {
    if (!clubId || !spawnTemplateId) return;
    const template = templates.find((row) => row.id === spawnTemplateId);
    if (!template) return;
    setTemplateBusy(true);
    const result = await spawnClubTaskFromTemplate({
      clubId,
      template,
      teamId: spawnTeamId === UNASSIGNED ? null : spawnTeamId,
      slotsTotal: starterSlotsForKey(template.key),
    });
    setTemplateBusy(false);
    if (result.error || !result.data) {
      toast({
        title: t.common.error,
        description: result.error?.message ?? t.tasksPage.templateSpawnFailed,
        variant: "destructive",
      });
      return;
    }
    toast({ title: t.tasksPage.templateSpawned });
    setSpawnTemplateId("");
    void reload();
    selectTask(result.data.id);
  };

  const handleQuickStatus = async (task: ClubTaskRow, nextStatus: ClubTaskStatus) => {
    if (!clubId) return;
    const { error } = await updateClubTask(task.id, clubId, { status: nextStatus });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    void reload();
  };

  const handleClaim = async (task: ClubTaskRow) => {
    setClaimBusy(true);
    const result = await claimClubTask(task.id);
    setClaimBusy(false);
    if (!result.ok) {
      toast({
        title: t.common.error,
        description: result.error || t.tasksPage.claimFailed,
        variant: "destructive",
      });
      return;
    }
    toast({ title: result.already ? t.tasksPage.claimAlready : t.tasksPage.claimSuccess });
    void reload();
  };

  const handleDelete = async (task: ClubTaskRow) => {
    if (!clubId) return;
    const canDelete = taskAccess.canDeleteTasks || task.created_by === user?.id;
    if (!canDelete) return;
    setDeleting(true);
    const { error } = await deleteClubTask(task.id, clubId);
    setDeleting(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    setTaskPendingDelete(null);
    selectTask(null);
    toast({ title: t.tasksPage.taskDeleted });
    void reload();
  };

  const priorityLabel = (value: ClubTaskPriority) =>
    t.tasksPage.priorities[value as keyof typeof t.tasksPage.priorities] ?? value;
  const statusLabel = (value: ClubTaskStatus) =>
    t.tasksPage.statuses[value as keyof typeof t.tasksPage.statuses] ?? value;

  const tabs: { id: ClubTaskFilter; label: string }[] = [
    ...(canSeeAllTasks ? [{ id: "all" as const, label: t.tasksPage.tabAll }] : []),
    { id: "mine", label: t.tasksPage.tabMine },
    { id: "overdue", label: t.tasksPage.tabOverdue },
  ];

  if (clubLoading) {
    return (
      <div className={DASHBOARD_PAGE_ROOT}>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.tasksPage.title}
        subtitle={t.tasksPage.subtitle}
        rightSlot={
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-end">
            {canManage ? <AiAgentHeaderButton intent="propose_claimable_duty" /> : null}
            {canManage ? (
              <Button size="sm" className="gap-1.5" data-testid="tasks-create-open" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t.tasksPage.newTask}</span>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={cn(DASHBOARD_PAGE_INNER, "flex min-h-0 flex-1 flex-col")}>
        <div className={TASK_PANEL_CLASS}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="inline-flex rounded-full bg-muted/50 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                    filter === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground sm:text-sm">
                {t.tasksPage.listCount.replace("{count}", String(tasks.length))}
                {filter === "all" && openCount !== tasks.length ? (
                  <span className="text-muted-foreground/80">
                    {" "}
                    · {openCount} {t.tasksPage.statuses.open.toLowerCase()}
                  </span>
                ) : null}
              </span>
              {canManage ? (
                <Button size="sm" variant="outline" className="gap-1.5 lg:hidden" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t.tasksPage.newTask}
                </Button>
              ) : null}
            </div>
          </div>

          {canManage ? (
            <div className="flex shrink-0 flex-col gap-2 border-b border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
              <div className="text-xs font-semibold text-foreground">{t.tasksPage.templatesTitle}</div>
              <p className="text-[11px] text-muted-foreground">{t.tasksPage.templatesHint}</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1 space-y-1">
                  <Label className="text-[11px]">{t.tasksPage.templatesPick}</Label>
                  <Select value={spawnTemplateId || "__none__"} onValueChange={(v) => setSpawnTemplateId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t.tasksPage.templatesPick} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t.tasksPage.templatesPick}</SelectItem>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[8rem] space-y-1">
                  <Label className="text-[11px]">{t.tasksPage.fieldTeam}</Label>
                  <Select value={spawnTeamId} onValueChange={setSpawnTeamId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t.tasksPage.clubWide} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>{t.tasksPage.clubWide}</SelectItem>
                      {teams.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="h-9"
                  disabled={templateBusy || !spawnTemplateId}
                  onClick={() => void handleSpawnTemplate()}
                >
                  {templateBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  {t.tasksPage.templatesSpawn}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={templateBusy}
                  onClick={() => void handleSeedTemplates()}
                >
                  {t.tasksPage.templatesSeed}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,22rem)]">
            <section className="flex min-h-0 min-h-[14rem] flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {loading ? (
                  <div className="flex h-full min-h-[12rem] items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.common.loading}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-10 text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ClipboardList className="h-7 w-7" />
                    </span>
                    <p className="font-display text-base font-semibold text-foreground">{t.tasksPage.emptyTitle}</p>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {t.tasksPage.emptyHint}
                    </p>
                    {canManage ? (
                      <Button className="mt-6 gap-1.5" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        {t.tasksPage.emptyCreate}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {tasks.map((task) => {
                      const overdue = isClubTaskOverdue(task);
                      const isSelected = selectedId === task.id;
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            data-testid="tasks-task-row"
                            onClick={() => selectTask(task.id)}
                            className={cn(
                              "flex w-full gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all sm:px-4",
                              isSelected
                                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/25"
                                : "border-border/50 bg-background/30 hover:border-primary/30 hover:bg-background/50",
                              overdue && !isSelected && "border-orange-500/35",
                            )}
                          >
                            <span className="mt-0.5 shrink-0">
                              {task.status === "done" ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Circle
                                  className={cn(
                                    "h-5 w-5",
                                    overdue ? "text-orange-400" : "text-muted-foreground",
                                  )}
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium leading-snug text-foreground">{task.title}</span>
                              {task.description ? (
                                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                                  {task.description}
                                </span>
                              ) : null}
                              <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    statusBadgeClass(task.status),
                                  )}
                                >
                                  {statusLabel(task.status)}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    priorityBadgeClass(task.priority),
                                  )}
                                >
                                  {priorityLabel(task.priority)}
                                </span>
                                {task.due_at ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                      overdue
                                        ? "bg-orange-500/15 text-orange-400"
                                        : "bg-muted/60 text-muted-foreground",
                                    )}
                                  >
                                    <CalendarClock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <aside className="flex min-h-0 flex-col bg-background/20">
              {selectedTask ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="shrink-0 border-b border-border/60 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="min-w-0 flex-1 font-display text-lg font-semibold leading-snug text-foreground">
                        {selectedTask.title}
                      </h2>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            statusBadgeClass(selectedTask.status),
                          )}
                        >
                          {statusLabel(selectedTask.status)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            priorityBadgeClass(selectedTask.priority),
                          )}
                        >
                          {priorityLabel(selectedTask.priority)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    {selectedTask.description ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {selectedTask.description}
                      </p>
                    ) : null}

                    <dl className="mt-5 space-y-3 rounded-2xl border border-border/50 bg-muted/20 p-3.5 text-sm">
                      {selectedTask.assignee_user_id ? (
                        <div className="flex items-center gap-2.5 text-foreground/90">
                          <User className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t.tasksPage.fieldAssignee}
                            </dt>
                            <dd>{assigneeLabelByUserId.get(selectedTask.assignee_user_id) ?? t.tasksPage.assigneeMember}</dd>
                          </div>
                        </div>
                      ) : null}
                      {selectedTask.partner_id ? (
                        <div className="flex items-center gap-2.5 text-foreground/90">
                          <Building2 className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t.tasksPage.fieldPartner}
                            </dt>
                            <dd>{partnerLabelById.get(selectedTask.partner_id) ?? t.tasksPage.assigneePartner}</dd>
                          </div>
                        </div>
                      ) : null}
                      {selectedTask.team_id ? (
                        <div className="flex items-center gap-2.5 text-foreground/90">
                          <Users className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t.tasksPage.fieldTeam}
                            </dt>
                            <dd>{teamLabelById.get(selectedTask.team_id) ?? t.tasksPage.team}</dd>
                          </div>
                        </div>
                      ) : null}
                      {selectedTask.due_at ? (
                        <div className="flex items-center gap-2.5 text-foreground/90">
                          <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t.tasksPage.dueLabel}
                            </dt>
                            <dd>{format(new Date(selectedTask.due_at), "PPp")}</dd>
                          </div>
                        </div>
                      ) : null}
                    </dl>

                    {clubId && selectedTask ? (
                      <TaskChecklistPanel
                        clubId={clubId}
                        taskId={selectedTask.id}
                        userId={user?.id ?? null}
                        canManage={canManage}
                        labels={{
                          title: t.tasksPage.checklistTitle,
                          add: t.tasksPage.checklistAdd,
                          empty: t.tasksPage.checklistEmpty,
                          progress: t.tasksPage.checklistProgress,
                          failed: t.tasksPage.checklistFailed,
                        }}
                        onToast={(payload) => toast(payload)}
                      />
                    ) : null}
                  </div>

                  <div className="shrink-0 space-y-2 border-t border-border/60 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-2">
                      {isClaimableDuty({
                        claimable: Boolean(selectedTask.claimable),
                        status: selectedTask.status,
                        assignee_user_id: selectedTask.assignee_user_id,
                        slots_total: selectedTask.slots_total,
                        slots_filled: selectedTask.slots_filled,
                      }) && selectedTask.assignee_user_id !== user?.id ? (
                        <Button size="sm" disabled={claimBusy} data-testid="tasks-claim-duty" onClick={() => void handleClaim(selectedTask)}>
                          {t.tasksPage.claimDuty}
                          {slotsLabel({
                            slotsTotal: selectedTask.slots_total,
                            slotsFilled: selectedTask.slots_filled,
                          })
                            ? ` (${slotsLabel({
                                slotsTotal: selectedTask.slots_total,
                                slotsFilled: selectedTask.slots_filled,
                              })})`
                            : ""}
                        </Button>
                      ) : null}
                      {selectedTask.status !== "done" && selectedTask.assignee_user_id === user?.id ? (
                        <Button size="sm" onClick={() => void handleQuickStatus(selectedTask, "done")}>
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          {t.tasksPage.markDone}
                        </Button>
                      ) : null}
                      {(canManage || selectedTask.created_by === user?.id) && selectedTask.status !== "done" ? (
                        <Button size="sm" variant="outline" onClick={() => openEdit(selectedTask)}>
                          <Pencil className="mr-1.5 h-4 w-4" />
                          {t.common.edit}
                        </Button>
                      ) : null}
                      {taskAccess.canDeleteTasks || selectedTask.created_by === user?.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setTaskPendingDelete(selectedTask)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          {t.common.delete}
                        </Button>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => navigate("/co-trainer?tab=chat")}
                    >
                      <Ai4TInlineLabel text={t.tasksPage.draftWithAi} logoClassName="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                    <ClipboardList className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-medium text-foreground">{t.tasksPage.selectTaskHint}</p>
                  {canManage && tasks.length > 0 ? (
                    <Button variant="link" className="mt-2 h-auto p-0 text-primary" onClick={openCreate}>
                      {t.tasksPage.newTask}
                    </Button>
                  ) : null}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t.tasksPage.editTask : t.tasksPage.newTask}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">{t.tasksPage.fieldTitle}</Label>
              <Input id="task-title" data-testid="tasks-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">{t.tasksPage.fieldDescription}</Label>
              <Textarea id="task-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.tasksPage.fieldPriority}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ClubTaskPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLUB_TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{priorityLabel(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <Label>{t.tasksPage.fieldStatus}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ClubTaskStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLUB_TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">{t.tasksPage.fieldDue}</Label>
              <Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.tasksPage.fieldAssignee}</Label>
              <Select
                value={assigneeUserId}
                onValueChange={setAssigneeUserId}
                disabled={claimable}
              >
                <SelectTrigger><SelectValue placeholder={t.tasksPage.unassigned} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{t.tasksPage.unassigned}</SelectItem>
                  {assignees.map((row) => (
                    <SelectItem key={row.user_id} value={row.user_id}>
                      {row.label} ({row.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox data-testid="tasks-claimable" checked={claimable} onCheckedChange={(c) => setClaimable(c === true)} />
              {t.tasksPage.claimableLabel}
            </label>
            <p className="text-[11px] text-muted-foreground">{t.tasksPage.claimableHint}</p>
            {claimable ? (
              <div className="space-y-2">
                <Label htmlFor="task-slots">{t.tasksPage.fieldSlots}</Label>
                <Input
                  id="task-slots"
                  inputMode="numeric"
                  value={slotsTotal}
                  onChange={(e) => setSlotsTotal(e.target.value)}
                  placeholder={t.tasksPage.fieldSlotsPlaceholder}
                />
                <p className="text-[11px] text-muted-foreground">{t.tasksPage.fieldSlotsHint}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>{t.tasksPage.fieldPartner}</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger><SelectValue placeholder={t.tasksPage.noPartner} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{t.tasksPage.noPartner}</SelectItem>
                  {partners.map((row) => (
                    <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.tasksPage.fieldTeam}</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue placeholder={t.tasksPage.clubWide} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{t.tasksPage.clubWide}</SelectItem>
                  {teams.map((row) => (
                    <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button data-testid="tasks-save" disabled={saving || !title.trim()} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(taskPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setTaskPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.tasksPage.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !taskPendingDelete}
              onClick={(event) => {
                event.preventDefault();
                if (!taskPendingDelete) return;
                void handleDelete(taskPendingDelete);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
