import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bot,
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
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
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
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
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
  const perms = usePermissions();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterParam = (searchParams.get("filter") as ClubTaskFilter | null) ?? "all";
  const filter: ClubTaskFilter =
    filterParam === "mine" || filterParam === "overdue" ? filterParam : "all";
  const selectedId = searchParams.get("id");

  const canManage = perms.isTrainer || perms.isAdmin;
  const { tasks, loading, reload } = useClubTasks(clubId, filter);
  const { assignees, partners, teams } = useClubTaskOptions(clubId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClubTaskRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ClubTaskPriority>("normal");
  const [status, setStatus] = useState<ClubTaskStatus>("open");
  const [dueAt, setDueAt] = useState("");
  const [teamId, setTeamId] = useState(UNASSIGNED);
  const [assigneeUserId, setAssigneeUserId] = useState(UNASSIGNED);
  const [partnerId, setPartnerId] = useState(UNASSIGNED);

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
    setDialogOpen(true);
  }, []);

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

  const handleSave = async () => {
    if (!clubId || !title.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      team_id: teamId === UNASSIGNED ? null : teamId,
      assignee_user_id: assigneeUserId === UNASSIGNED ? null : assigneeUserId,
      partner_id: partnerId === UNASSIGNED ? null : partnerId,
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

  const handleQuickStatus = async (task: ClubTaskRow, nextStatus: ClubTaskStatus) => {
    if (!clubId) return;
    const { error } = await updateClubTask(task.id, clubId, { status: nextStatus });
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    void reload();
  };

  const handleDelete = async (task: ClubTaskRow) => {
    if (!clubId || !perms.isAdmin) return;
    if (!window.confirm(t.tasksPage.confirmDelete)) return;
    const { error } = await deleteClubTask(task.id, clubId);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }
    selectTask(null);
    toast({ title: t.tasksPage.taskDeleted });
    void reload();
  };

  const priorityLabel = (value: ClubTaskPriority) =>
    t.tasksPage.priorities[value as keyof typeof t.tasksPage.priorities] ?? value;
  const statusLabel = (value: ClubTaskStatus) =>
    t.tasksPage.statuses[value as keyof typeof t.tasksPage.statuses] ?? value;

  const tabs: { id: ClubTaskFilter; label: string }[] = [
    { id: "all", label: t.tasksPage.tabAll },
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
          canManage ? (
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.tasksPage.newTask}</span>
            </Button>
          ) : null
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
                  </div>

                  <div className="shrink-0 space-y-2 border-t border-border/60 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-2">
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
                      {perms.isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(selectedTask)}
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
                      className="w-full justify-center gap-1.5 text-muted-foreground"
                      onClick={() => navigate("/co-trainer?tab=chat")}
                    >
                      <Bot className="h-4 w-4" />
                      {t.tasksPage.draftWithAi}
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
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
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
            <Button disabled={saving || !title.trim()} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
