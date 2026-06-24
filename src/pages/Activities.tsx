import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import {
  Calendar,
  Loader2,
  Plus,
  Clock,
  Filter,
  Users,
  PanelRight,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useMembershipId } from "@/hooks/use-membership-id";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { useLanguage } from "@/hooks/use-language";
import { AiAgentHeaderButton } from "@/components/ai-agent/AiAgentHeaderButton";
import { useRegisterAiAgentContext } from "@/hooks/use-register-ai-agent-context";
import { TrainingAttendanceRsvp } from "@/components/activities/training-attendance-rsvp";
import { TrainingAttendanceSummaryBar } from "@/components/activities/training-attendance-summary-bar";
import { TrainingAttendanceTrainerPanel } from "@/components/activities/training-attendance-trainer-panel";
import {
  buildRosterAttendanceLines,
  summarizeTrainingAttendance,
  type TrainingAttendanceRow,
} from "@/lib/training-attendance";

type ActivityType = "training" | "match" | "event";

type ActivityRow = {
  id: string;
  club_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  team_id: string | null;
  created_by: string;
  created_at: string;
};

type TeamRow = { id: string; name: string };

type AttendanceRow = TrainingAttendanceRow & { club_id: string };

type TeamPlayerRow = {
  team_id: string;
  membership_id: string;
  jersey_number: number | null;
};

type RosterMember = {
  membershipId: string;
  name: string;
  role: string;
  jerseyNumber: number | null;
};

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  profiles?: { display_name: string | null } | null;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Safety cap for active membership list in trainer attendance UI. See ops/FAN_OUT_AUDIT.md. */
const ACTIVITY_ROSTER_FETCH_CAP = 800;

function nextDowAt(hour: number, minute: number, dow0Sun: number): Date {
  const now = new Date();
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  const day = d.getDay();
  let delta = (dow0Sun - day + 7) % 7;
  // If it's today but time already passed, push to next week.
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function rosterMemberFromMembership(m: MembershipRow, jerseyNumber: number | null = null): RosterMember {
  return {
    membershipId: m.id,
    name: m.profiles?.display_name || m.id.slice(0, 8),
    role: m.role,
    jerseyNumber,
  };
}

function buildActivityRoster(
  activity: ActivityRow,
  memberships: MembershipRow[],
  teamPlayers: TeamPlayerRow[],
): RosterMember[] {
  if (activity.team_id) {
    const jerseyByMember = new Map(
      teamPlayers.filter((tp) => tp.team_id === activity.team_id).map((tp) => [tp.membership_id, tp.jersey_number]),
    );
    const memberIds = new Set(jerseyByMember.keys());
    return memberships
      .filter((m) => m.status === "active" && memberIds.has(m.id))
      .map((m) => rosterMemberFromMembership(m, jerseyByMember.get(m.id) ?? null));
  }

  return memberships
    .filter((m) => m.status === "active" && (m.role === "player" || m.role === "member"))
    .map((m) => rosterMemberFromMembership(m));
}

export default function Activities() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { membershipId, loading: membershipLoading } = useMembershipId();
  const perms = usePermissions();
  const { toast } = useToast();
  const { t } = useLanguage();

  const canCreate = perms.isTrainer;
  const agentPageContext = useMemo(() => ({ source: "activities" as const }), []);
  useRegisterAiAgentContext(agentPageContext);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayerRow[]>([]);
  const [rsvpBusyId, setRsvpBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("training");
  const [startsAt, setStartsAt] = useState("");
  const [teamId, setTeamId] = useState<string>("");

  // Filters
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [filterShowPast, setFilterShowPast] = useState(false);

  // Attendance drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerActivityId, setDrawerActivityId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    try {
      const now = new Date();
      const fromIso = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();

      const [{ data: teamData, error: teamErr }, { data: acts, error: actsErr }] = await Promise.all([
        supabase.from("teams").select("id, name").eq("club_id", clubId).order("name"),
        supabase
          .from("activities")
          .select("*")
          .eq("club_id", clubId)
          .gte("starts_at", fromIso)
          .order("starts_at", { ascending: true })
          .limit(200),
      ]);

      if (teamErr) throw teamErr;
      if (actsErr) throw actsErr;

      setTeams((teamData as unknown as TeamRow[]) ?? []);
      const actRows = (acts as unknown as ActivityRow[]) ?? [];
      setActivities(actRows);

      const actIds = actRows.map((a) => a.id);
      const teamIds = ((teamData as unknown as TeamRow[]) ?? []).map((team) => team.id);

      // trainer: overview needs membership roster (for drawer)
      if (perms.isTrainer) {
        const [{ data: att, error: attErr }, { data: ms, error: msErr }, { data: tp, error: tpErr }] = await Promise.all([
          actIds.length
            ? supabase
                .from("activity_attendance")
                .select("id, club_id, activity_id, membership_id, status, notes")
                .eq("club_id", clubId)
                .in("activity_id", actIds)
            : Promise.resolve({ data: [] as AttendanceRow[], error: null } as { data: AttendanceRow[]; error: null }),
          supabase
            .from("club_memberships")
            .select("id, role, status, profiles!club_memberships_profile_fk(display_name)")
            .eq("club_id", clubId)
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(ACTIVITY_ROSTER_FETCH_CAP),
          teamIds.length
            ? supabase.from("team_players").select("team_id, membership_id, jersey_number").in("team_id", teamIds)
            : Promise.resolve({ data: [] as TeamPlayerRow[], error: null } as { data: TeamPlayerRow[]; error: null }),
        ]);

        if (attErr) throw attErr;
        if (msErr) throw msErr;
        if (tpErr) throw tpErr;

        setAttendance((att as unknown as AttendanceRow[]) ?? []);
        setMemberships((ms as unknown as MembershipRow[]) ?? []);
        setTeamPlayers((tp as unknown as TeamPlayerRow[]) ?? []);
      } else if (membershipId) {
        const { data: att, error: attErr } = actIds.length
          ? await supabase
              .from("activity_attendance")
              .select("id, club_id, activity_id, membership_id, status, notes")
              .eq("club_id", clubId)
              .eq("membership_id", membershipId)
              .in("activity_id", actIds)
          : { data: [], error: null };

        if (attErr) throw attErr;
        setAttendance((att as unknown as AttendanceRow[]) ?? []);
        setMemberships([]);
        setTeamPlayers([]);
      } else {
        setAttendance([]);
        setMemberships([]);
        setTeamPlayers([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.activitiesPage.loadFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, membershipId, perms.isTrainer, toast, t.common.error, t.activitiesPage.loadFailed]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const myAttendanceByActivity = useMemo(() => {
    const map: Record<string, AttendanceRow> = {};
    if (!membershipId) return map;
    for (const row of attendance) {
      if (row.membership_id === membershipId) map[row.activity_id] = row;
    }
    return map;
  }, [attendance, membershipId]);

  const attendanceByActivity = useMemo(() => {
    const map: Record<string, ReturnType<typeof summarizeTrainingAttendance>> = {};
    if (!perms.isTrainer) return map;
    for (const activity of activities) {
      const roster = buildActivityRoster(activity, memberships, teamPlayers);
      const byMember: Record<string, AttendanceRow> = {};
      for (const row of attendance) {
        if (row.activity_id === activity.id) byMember[row.membership_id] = row;
      }
      const lines = buildRosterAttendanceLines({ roster, attendanceByMember: byMember });
      map[activity.id] = summarizeTrainingAttendance(
        lines.map((line) => ({
          id: byMember[line.membershipId]?.id ?? line.membershipId,
          activity_id: activity.id,
          membership_id: line.membershipId,
          status: line.status,
          notes: byMember[line.membershipId]?.notes ?? null,
        })),
      );
    }
    return map;
  }, [activities, attendance, memberships, perms.isTrainer, teamPlayers]);

  const drawerActivity = useMemo(() => {
    if (!drawerActivityId) return null;
    return activities.find((a) => a.id === drawerActivityId) ?? null;
  }, [activities, drawerActivityId]);

  const drawerRoster = useMemo(() => {
    if (!drawerActivity) return [];
    return buildActivityRoster(drawerActivity, memberships, teamPlayers);
  }, [drawerActivity, memberships, teamPlayers]);

  const visibleActivities = useMemo(() => {
    const now = Date.now();

    return activities
      .filter((a) => (filterShowPast ? true : new Date(a.starts_at).getTime() >= now - 1000 * 60 * 60 * 24))
      .filter((a) => (filterType === "all" ? true : a.type === filterType))
      .filter((a) => (filterTeamId ? a.team_id === filterTeamId : true))
      .filter((a) => {
        if (!filterMine) return true;
        const att = myAttendanceByActivity[a.id];
        return att?.status === "confirmed" || att?.status === "attended";
      });
  }, [activities, filterShowPast, filterType, filterTeamId, filterMine, myAttendanceByActivity]);

  const grouped = useMemo(() => {
    const byDay: Record<string, ActivityRow[]> = {};
    for (const a of visibleActivities) {
      const day = new Date(a.starts_at).toLocaleDateString();
      (byDay[day] ??= []).push(a);
    }
    return byDay;
  }, [visibleActivities]);

  const drawerLists = useMemo(() => {
    if (!drawerActivityId || !perms.isTrainer) return null;

    const byMember: Record<string, AttendanceRow> = {};
    for (const row of attendance) {
      if (row.activity_id === drawerActivityId) byMember[row.membership_id] = row;
    }

    const lines = buildRosterAttendanceLines({ roster: drawerRoster, attendanceByMember: byMember });
    return {
      confirmed: lines.filter((l) => l.status === "confirmed" || l.status === "attended"),
      declined: lines.filter((l) => l.status === "declined"),
      invited: lines.filter((l) => l.status === "invited"),
    };
  }, [attendance, drawerActivityId, drawerRoster, perms.isTrainer]);

  const openDrawer = (activityId: string) => {
    setDrawerActivityId(activityId);
    setDrawerOpen(true);
  };

  const nudgeUnconfirmed = async () => {
    if (!drawerLists || !drawerActivity) return;

    // HOLD: real sending. For now, copy a message template.
    const names = drawerLists.invited.map((x) => x.name).slice(0, 12);
    const rest = Math.max(0, drawerLists.invited.length - names.length);

    const msg =
      `Reminder: please confirm your RSVP for "${drawerActivity.title}" (${new Date(drawerActivity.starts_at).toLocaleString()}).\n\n` +
      `Unconfirmed: ${names.join(", ")}${rest ? ` (+${rest} more)` : ""}\n\n` +
      `Reply with ✅ if you can make it, ❌ if not.`;

    try {
      await navigator.clipboard.writeText(msg);
      toast({ title: t.activitiesPage.toastCopied, description: t.activitiesPage.toastCopiedDesc });
    } catch {
      toast({ title: t.activitiesPage.toastNudge, description: msg });
    }
  };

  const handleCreate = async () => {
    if (!user || !clubId) return;
    if (!canCreate) {
      toast({ title: "Not authorized", description: "Only trainers/admins can create activities.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !startsAt) return;

    const iso = new Date(startsAt).toISOString();

    const { error } = await supabase.from("activities").insert({
      club_id: clubId,
      type,
      title: title.trim(),
      starts_at: iso,
      team_id: teamId || null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: t.activitiesPage.toastActivityCreated });
    setShowCreate(false);
    setTitle("");
    setStartsAt("");
    setTeamId("");
    await fetchData();
  };

  const createWeekTemplate = async () => {
    if (!user || !clubId) return;
    if (!canCreate) return;

    const team = filterTeamId || null;

    // Next week template: Mon 18:00 training, Wed 18:00 training, Sat 15:00 match
    const mon = nextDowAt(18, 0, 1);
    const wed = nextDowAt(18, 0, 3);
    const sat = nextDowAt(15, 0, 6);

    const rows = [
      { club_id: clubId, type: "training" as const, title: "Training", starts_at: mon.toISOString(), team_id: team, created_by: user.id },
      { club_id: clubId, type: "training" as const, title: "Training", starts_at: wed.toISOString(), team_id: team, created_by: user.id },
      { club_id: clubId, type: "match" as const, title: "Match", starts_at: sat.toISOString(), team_id: team, created_by: user.id },
    ];

    const { error } = await supabase.from("activities").insert(rows);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: t.activitiesPage.weekCreated,
      description: team ? t.activitiesPage.weekCreatedDescWithTeam : t.activitiesPage.weekCreatedDesc,
    });

    await fetchData();
  };

  const rsvp = async (activityId: string, status: "confirmed" | "declined", notes?: string | null) => {
    if (!user || !clubId || !membershipId) return;

    setRsvpBusyId(activityId);
    try {
      const existing = myAttendanceByActivity[activityId];
      const payload = {
        status,
        notes: status === "declined" ? notes?.trim() || null : null,
      };

      if (existing) {
        const { error } = await supabase
          .from("activity_attendance")
          .update(payload)
          .eq("club_id", clubId)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("activity_attendance").insert({
          club_id: clubId,
          activity_id: activityId,
          membership_id: membershipId,
          ...payload,
        });

        if (error) throw error;
      }

      toast({
        title: status === "confirmed" ? t.activitiesPage.rsvpConfirmed : t.activitiesPage.rsvpDeclined,
        description: status === "declined" && notes?.trim() ? notes.trim() : undefined,
      });
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setRsvpBusyId(null);
    }
  };

  const rsvpLabels = useMemo(
    () => ({
      coming: t.activitiesPage.attendanceComing,
      notComing: t.activitiesPage.attendanceNotComing,
      changeResponse: t.activitiesPage.attendanceYourResponse,
      statusComing: t.activitiesPage.attendanceStatusComing,
      statusNotComing: t.activitiesPage.attendanceStatusNotComing,
      statusPending: t.activitiesPage.attendanceStatusPending,
      declineTitle: t.activitiesPage.attendanceDeclineTitle,
      declineDescription: t.activitiesPage.attendanceDeclineDescription,
      declineReasonLabel: t.activitiesPage.attendanceDeclineReasonLabel,
      declineReasonPlaceholder: t.activitiesPage.attendanceDeclineReasonPlaceholder,
      declineConfirm: t.activitiesPage.attendanceDeclineConfirm,
      declineCancel: t.common.cancel,
      reasonRequired: t.activitiesPage.attendanceReasonRequired,
      presets: [
        { id: "injury", label: t.activitiesPage.attendancePresetInjury },
        { id: "illness", label: t.activitiesPage.attendancePresetIllness },
        { id: "school", label: t.activitiesPage.attendancePresetSchool },
        { id: "work", label: t.activitiesPage.attendancePresetWork },
        { id: "vacation", label: t.activitiesPage.attendancePresetVacation },
      ],
    }),
    [t],
  );

  const trainerPanelLabels = useMemo(
    () => ({
      title: t.activitiesPage.attendancePanelTitle,
      coming: t.activitiesPage.attendanceStatComing,
      declined: t.activitiesPage.attendanceStatDeclined,
      pending: t.activitiesPage.attendanceStatPending,
      summaryComing: t.activitiesPage.attendanceSummaryHeadline,
      tabComing: t.activitiesPage.attendanceTabComing,
      tabDeclined: t.activitiesPage.attendanceTabDeclined,
      tabPending: t.activitiesPage.attendanceTabPending,
      nudge: t.activitiesPage.attendanceNudge,
      noPlayers: t.activitiesPage.attendanceNoPlayers,
      reasonPrefix: t.activitiesPage.attendanceReasonPrefix,
      rosterScopeTeam: t.activitiesPage.attendanceRosterTeam,
      rosterScopeClub: t.activitiesPage.attendanceRosterClub,
      nudgeFootnote: t.activitiesPage.attendanceNudgeFootnote,
      copyList: t.activitiesPage.attendanceCopyList,
    }),
    [t],
  );

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot
        title={t.activitiesPage.title}
        subtitle={perms.isTrainer ? t.activitiesPage.subtitleTrainer : t.activitiesPage.subtitlePlayer}
        toolbarRevision={`${perms.isTrainer}-${canCreate}`}
        rightSlot={
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-end">
            <AiAgentHeaderButton intent="plan_training_week" />
            {perms.isTrainer && (
              <Button size="sm" variant="outline" className="rounded-2xl text-xs sm:text-sm shrink-0" onClick={createWeekTemplate} disabled={!clubId}>
                <Sparkles className="w-4 h-4 mr-1" /> {t.activitiesPage.weekTemplate}
              </Button>
            )}
            {canCreate ? (
              <Button
                size="sm"
                className="bg-gradient-gold-static text-primary-foreground font-semibold hover:brightness-110 text-xs sm:text-sm shrink-0"
                onClick={() => setShowCreate(true)}
                disabled={!clubId}
              >
                <Plus className="w-4 h-4 mr-1" /> {t.activitiesPage.newActivity}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={DASHBOARD_PAGE_INNER}>
        {(clubLoading || membershipLoading || loading) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !clubId ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.activitiesPage.noClubTitle}</h2>
            <p className="text-muted-foreground">{t.activitiesPage.noClubDesc}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Filters */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="w-4 h-4" /> Filters
                </div>
                {perms.isTrainer && (
                  <div className="text-[11px] text-muted-foreground">
                    Tip: set a Team filter, then use <span className="text-foreground/80 font-medium">Week template</span>.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {([
                  { id: "all", label: "All" },
                  { id: "training", label: "Training" },
                  { id: "match", label: "Match" },
                  { id: "event", label: "Event" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id as ActivityType | "all")}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      filterType === t.id
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}

                <Select value={filterTeamId || "__all"} onValueChange={(value) => setFilterTeamId(value === "__all" ? "" : value)}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-xl border-border/60 bg-background/40 px-3 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => setFilterMine((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                    filterMine ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                  }`}
                >
                  My sessions
                </button>

                <button
                  onClick={() => setFilterShowPast((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                    filterShowPast ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                  }`}
                >
                  Show past
                </button>
              </div>
            </div>

            {/* List */}
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">Nothing scheduled</h2>
                <p className="text-muted-foreground">Create your next training session to kick off the week.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([day, items]) => (
                <div key={day}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">{day}</div>
                  <div className="grid gap-3">
                    {items.map((a) => {
                      const my = myAttendanceByActivity[a.id] ?? null;
                      const sum = attendanceByActivity[a.id] ?? null;
                      const teamName = a.team_id ? teams.find((tm) => tm.id === a.team_id)?.name ?? null : null;
                      const showAttendance = a.type === "training" || a.type === "match";

                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-background/40 text-muted-foreground">
                                  {a.type.toUpperCase()}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {fmtTime(a.starts_at)}
                                </span>
                                {teamName ? (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {teamName}
                                  </span>
                                ) : null}
                                {a.location ? (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {a.location}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-1 font-display text-lg font-bold text-foreground">{a.title}</div>
                            </div>

                            {perms.isTrainer && showAttendance ? (
                              <Button size="sm" variant="outline" className="shrink-0 rounded-2xl" onClick={() => openDrawer(a.id)}>
                                <PanelRight className="mr-1.5 h-4 w-4" />
                                {t.activitiesPage.attendanceViewRoster}
                              </Button>
                            ) : null}
                          </div>

                          {perms.isTrainer && sum && showAttendance ? (
                            <TrainingAttendanceSummaryBar
                              summary={sum}
                              headline={t.activitiesPage.attendanceSummaryHeadline
                                .replace("{count}", String(sum.confirmed + sum.attended))
                                .replace("{total}", String(sum.total))}
                              statComing={t.activitiesPage.attendanceStatComing}
                              statDeclined={t.activitiesPage.attendanceStatDeclined}
                              statPending={t.activitiesPage.attendanceStatPending}
                            />
                          ) : null}

                          {membershipId && showAttendance ? (
                            <TrainingAttendanceRsvp
                              activityTitle={a.title}
                              myAttendance={my}
                              busy={rsvpBusyId === a.id}
                              onRespond={(status, notes) => rsvp(a.id, status, notes)}
                              labels={rsvpLabels}
                            />
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/60 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-foreground">New activity</div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Title</div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.activitiesPage.phTitle} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["training", "event", "match"] as ActivityType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      type === t
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Team (optional)</div>
                <Select value={teamId || "__none"} onValueChange={(value) => setTeamId(value === "__none" ? "" : value)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Starts at</div>
                <Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder={t.placeholders.dateTimeLocal} />
                <div className="mt-1 text-[10px] text-muted-foreground">We parse via Date().</div>
              </div>

              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold" onClick={handleCreate}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && drawerActivity && drawerLists ? (
        <TrainingAttendanceTrainerPanel
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          activityTitle={drawerActivity.title}
          activityStartsAt={drawerActivity.starts_at}
          activityType={drawerActivity.type}
          teamName={drawerActivity.team_id ? teams.find((tm) => tm.id === drawerActivity.team_id)?.name ?? null : null}
          roster={drawerRoster}
          attendance={attendance.filter((row) => row.activity_id === drawerActivity.id)}
          onNudgeUnconfirmed={nudgeUnconfirmed}
          labels={trainerPanelLabels}
        />
      ) : null}
    </div>
  );
}
