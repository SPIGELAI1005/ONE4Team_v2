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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useMembershipId } from "@/hooks/use-membership-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useModuleDataScope } from "@/hooks/use-module-data-scope";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { useLanguage } from "@/hooks/use-language";
import { usePlanGuard } from "@/hooks/use-plan-guard";
import { AiAgentHeaderButton } from "@/components/ai-agent/AiAgentHeaderButton";
import { useRegisterAiAgentContext } from "@/hooks/use-register-ai-agent-context";
import { TrainingAttendanceRsvp } from "@/components/activities/training-attendance-rsvp";
import { TrainingAttendanceOverview } from "@/components/activities/training-attendance-overview";
import { TrainingAttendanceTrainerPanel } from "@/components/activities/training-attendance-trainer-panel";
import { ActivityTransportPanel } from "@/components/activities/activity-transport-panel";
import { ActivityGuestsPanel } from "@/components/activities/activity-guests-panel";
import { ActivityOpsTabs } from "@/components/activities/activity-ops-tabs";
import { ActivityReadinessBadge } from "@/components/activities/activity-readiness-badge";
import {
  buildActivityAttendanceOverview,
  buildActivityRoster,
  buildRosterAttendanceLines,
  isActivityRsvpOpen,
  summarizeTrainingAttendance,
  type TrainingAttendanceResponseReason,
  type TrainingAttendanceRow,
} from "@/lib/training-attendance";
import {
  mapAttendanceRpcError,
  upsertActivityAttendanceResponse,
} from "@/lib/activity-attendance-api";
import { remindMissingActivityAttendance } from "@/lib/activity-attendance-reminders-api";
import {
  availabilityHintLabel,
  findOverlappingAvailability,
  suggestedRsvpFromAvailability,
  type MemberAvailabilityRow,
} from "@/lib/member-availability";
import { listMemberAvailabilityForMembers } from "@/lib/member-availability-api";
import {
  listEditableMemberMasterMemberships,
  type EditableMemberMasterRow,
} from "@/lib/member-master-api";
import { formatSupabaseError, isRlsOrPermissionError } from "@/lib/supabase-error";

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
  response_deadline?: string | null;
  response_required?: boolean | null;
  automatic_reminders?: boolean | null;
  capacity?: number | null;
};

type TeamRow = { id: string; name: string };

type AttendanceRow = TrainingAttendanceRow & { club_id: string };

type TeamPlayerRow = {
  team_id: string;
  membership_id: string;
  jersey_number: number | null;
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

function rosterMembershipsFromRows(memberships: MembershipRow[]) {
  return memberships.map((m) => ({
    id: m.id,
    role: m.role,
    status: m.status,
    displayName: m.profiles?.display_name?.trim() || m.id.slice(0, 8),
  }));
}

function buildActivityRosterFromRows(
  activity: ActivityRow,
  memberships: MembershipRow[],
  teamPlayers: TeamPlayerRow[],
) {
  return buildActivityRoster({
    teamId: activity.team_id,
    memberships: rosterMembershipsFromRows(memberships),
    teamPlayers,
  });
}

/** RSVP picker rows — use relationship; club admins get edit_actor manager on self/ward. */
function isRsvpParticipantRow(row: EditableMemberMasterRow): boolean {
  const rel = row.relationship?.trim().toLowerCase();
  if (rel === "self" || rel === "guardian" || rel === "household_email") return true;
  return row.edit_actor === "self" || row.edit_actor === "guardian";
}

export default function Activities() {
  const { user } = useAuth();
  const { clubId, loading: clubLoading } = useClubId();
  const { membershipId, loading: membershipLoading } = useMembershipId();
  const perms = usePermissions();
  const activityScope = useModuleDataScope("trainings");
  const isPlayerFocusedView = !activityScope.isClubWide;
  const scopedTeamIds = activityScope.teamIds;
  const { toast } = useToast();
  const { t } = useLanguage();
  const { canUseFeature } = usePlanGuard();
  const canUseCarpoolGuests = canUseFeature("carpoolGuests");

  const canCreate = perms.isTrainer;
  const canConvertGuests = perms.isTrainer || perms.isAdmin;
  const agentPageContext = useMemo(() => ({ source: "activities" as const }), []);
  useRegisterAiAgentContext(agentPageContext);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayerRow[]>([]);
  const [rsvpBusyId, setRsvpBusyId] = useState<string | null>(null);
  const [rsvpParticipantId, setRsvpParticipantId] = useState<string | null>(null);
  const [rsvpPeople, setRsvpPeople] = useState<EditableMemberMasterRow[]>([]);
  const [availabilityRows, setAvailabilityRows] = useState<MemberAvailabilityRow[]>([]);
  const [remindBusyId, setRemindBusyId] = useState<string | null>(null);
  const [markAttendedBusyId, setMarkAttendedBusyId] = useState<string | null>(null);
  const [filterNeedsResponse, setFilterNeedsResponse] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("training");
  const [startsAt, setStartsAt] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [responseRequired, setResponseRequired] = useState(false);
  const [customReminderAt, setCustomReminderAt] = useState("");

  // Filters
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [filterShowPast, setFilterShowPast] = useState(false);

  // Attendance drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerActivityId, setDrawerActivityId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      return;
    }

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

      // Load roster + full attendance for member RSVP overview
      if (membershipId) {
        const [{ data: att, error: attErr }, { data: ms, error: msErr }, { data: tp, error: tpErr }] = await Promise.all([
          actIds.length
            ? supabase
                .from("activity_attendance")
                .select("id, club_id, activity_id, membership_id, status, notes, response_reason, responded_by, responded_at")
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

        const { data: editable } = await listEditableMemberMasterMemberships(clubId);
        const people = (editable ?? []).filter(isRsvpParticipantRow);
        setRsvpPeople(people);
        setRsvpParticipantId((prev) => {
          if (prev && people.some((p) => p.membership_id === prev)) return prev;
          const self = people.find(
            (p) => p.relationship?.trim().toLowerCase() === "self" || p.edit_actor === "self",
          )?.membership_id;
          return self ?? people[0]?.membership_id ?? membershipId;
        });

        const participantIds = people.map((p) => p.membership_id);
        if (participantIds.length && actRows.length) {
          const fromIsoAvail = actRows[0]?.starts_at ?? fromIso;
          const toIsoAvail =
            actRows[actRows.length - 1]?.ends_at ??
            actRows[actRows.length - 1]?.starts_at ??
            fromIso;
          const { data: avail } = await listMemberAvailabilityForMembers({
            clubId,
            membershipIds: participantIds,
            fromIso: fromIsoAvail,
            toIso: new Date(new Date(toIsoAvail).getTime() + 3 * 60 * 60 * 1000).toISOString(),
          });
          setAvailabilityRows(avail);
        } else {
          setAvailabilityRows([]);
        }
      } else {
        setAttendance([]);
        setMemberships([]);
        setTeamPlayers([]);
        setRsvpPeople([]);
        setRsvpParticipantId(null);
        setAvailabilityRows([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.activitiesPage.loadFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clubId, membershipId, toast, t.common.error, t.activitiesPage.loadFailed]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!clubId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void fetchData();
      }, 400);
    };

    const channel = supabase
      .channel(`activity-attendance-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_attendance", filter: `club_id=eq.${clubId}` },
        scheduleReload,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [clubId, fetchData]);

  const scopeFilteredActivities = useMemo(() => {
    if (!isPlayerFocusedView) return activities;
    return activities.filter((activity) => {
      if (activity.type === "event") return true;
      if (!activity.team_id) return false;
      if (scopedTeamIds === "all") return true;
      if (scopedTeamIds.length === 0) return false;
      return scopedTeamIds.includes(activity.team_id);
    });
  }, [activities, isPlayerFocusedView, scopedTeamIds]);

  const playerTeamOptions = useMemo(() => {
    if (!isPlayerFocusedView || scopedTeamIds === "all") return teams;
    const allowed = new Set(scopedTeamIds);
    return teams.filter((team) => allowed.has(team.id));
  }, [isPlayerFocusedView, scopedTeamIds, teams]);

  const activeRsvpMembershipId = rsvpParticipantId || membershipId;

  const myAttendanceByActivity = useMemo(() => {
    const map: Record<string, AttendanceRow> = {};
    if (!activeRsvpMembershipId) return map;
    for (const row of attendance) {
      if (row.membership_id === activeRsvpMembershipId) map[row.activity_id] = row;
    }
    return map;
  }, [attendance, activeRsvpMembershipId]);

  const attendanceByActivity = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildActivityAttendanceOverview>> = {};
    if (!membershipId) return map;
    for (const activity of scopeFilteredActivities) {
      if (activity.type !== "training" && activity.type !== "match") continue;
      const roster = buildActivityRosterFromRows(activity, memberships, teamPlayers);
      const rows = attendance.filter((row) => row.activity_id === activity.id);
      map[activity.id] = buildActivityAttendanceOverview({ roster, attendanceRows: rows });
    }
    return map;
  }, [scopeFilteredActivities, attendance, membershipId, memberships, teamPlayers]);

  const drawerActivity = useMemo(() => {
    if (!drawerActivityId) return null;
    return scopeFilteredActivities.find((a) => a.id === drawerActivityId) ?? null;
  }, [scopeFilteredActivities, drawerActivityId]);

  const drawerRoster = useMemo(() => {
    if (!drawerActivity) return [];
    return buildActivityRosterFromRows(drawerActivity, memberships, teamPlayers);
  }, [drawerActivity, memberships, teamPlayers]);

  const visibleActivities = useMemo(() => {
    const now = Date.now();

    return scopeFilteredActivities
      .filter((a) => (filterShowPast ? true : new Date(a.starts_at).getTime() >= now - 1000 * 60 * 60 * 24))
      .filter((a) => (filterType === "all" ? true : a.type === filterType))
      .filter((a) => (filterTeamId ? a.team_id === filterTeamId : true))
      .filter((a) => {
        if (!filterMine) return true;
        const att = myAttendanceByActivity[a.id];
        return att?.status === "confirmed" || att?.status === "attended";
      })
      .filter((a) => {
        if (!filterNeedsResponse || !perms.isTrainer) return true;
        const overview = attendanceByActivity[a.id];
        if (!overview) return false;
        return overview.summary.pending > 0 || overview.summary.declined > 0;
      });
  }, [
    scopeFilteredActivities,
    filterShowPast,
    filterType,
    filterTeamId,
    filterMine,
    filterNeedsResponse,
    myAttendanceByActivity,
    attendanceByActivity,
    perms.isTrainer,
  ]);

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
      maybe: lines.filter((l) => l.status === "maybe"),
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
      toast({ title: t.common.notAuthorized, description: t.activitiesPage.toastTrainerOnly, variant: "destructive" });
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
      response_deadline: responseDeadline ? new Date(responseDeadline).toISOString() : null,
      response_required: responseRequired,
      automatic_reminders: responseRequired,
      custom_reminder_at:
        responseRequired && customReminderAt ? new Date(customReminderAt).toISOString() : null,
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
    setResponseDeadline("");
    setResponseRequired(false);
    setCustomReminderAt("");
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
      { club_id: clubId, type: "training" as const, title: t.activitiesPage.filterTraining, starts_at: mon.toISOString(), team_id: team, created_by: user.id },
      { club_id: clubId, type: "training" as const, title: t.activitiesPage.filterTraining, starts_at: wed.toISOString(), team_id: team, created_by: user.id },
      { club_id: clubId, type: "match" as const, title: t.activitiesPage.filterMatch, starts_at: sat.toISOString(), team_id: team, created_by: user.id },
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

  const rsvp = async (
    activityId: string,
    status: "confirmed" | "declined" | "maybe",
    notes?: string | null,
    responseReason?: TrainingAttendanceResponseReason | null,
  ) => {
    if (!user || !clubId || !activeRsvpMembershipId) return;

    const activity = activities.find((a) => a.id === activityId);
    if (
      activity &&
      !isActivityRsvpOpen({
        type: activity.type,
        startsAt: activity.starts_at,
        responseDeadline: activity.response_deadline,
      })
    ) {
      toast({
        title: t.common.error,
        description: t.activitiesPage.attendanceRsvpClosedTraining,
        variant: "destructive",
      });
      return;
    }

    const overview = attendanceByActivity[activityId];
    const invited =
      !overview?.lines.length ||
      Boolean(myAttendanceByActivity[activityId]) ||
      overview.lines.some((line) => line.membershipId === activeRsvpMembershipId);
    if (!invited) {
      toast({
        title: t.common.error,
        description: t.activitiesPage.attendanceNotInvited,
        variant: "destructive",
      });
      return;
    }

    setRsvpBusyId(activityId);
    try {
      const result = await upsertActivityAttendanceResponse({
        activityId,
        membershipId: activeRsvpMembershipId,
        status,
        notes: status === "declined" ? notes?.trim() || null : null,
        responseReason: status === "declined" ? responseReason ?? null : null,
      });

      if (!result.ok) {
        throw Object.assign(new Error(result.error), { attendanceCode: result.error });
      }

      toast({
        title:
          status === "confirmed"
            ? t.activitiesPage.rsvpConfirmed
            : status === "maybe"
              ? t.activitiesPage.rsvpMaybe
              : status === "declined"
                ? t.activitiesPage.rsvpDeclined
                : t.activitiesPage.rsvpDeclined,
        description:
          result.attendance.status === "waitlisted"
            ? t.activitiesPage.rsvpWaitlisted
            : status === "declined" && notes?.trim()
              ? notes.trim()
              : undefined,
      });
      await fetchData();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "attendanceCode" in err
          ? String((err as { attendanceCode: string }).attendanceCode)
          : "";
      const msg = code
        ? mapAttendanceRpcError(code, {
            closed: t.activitiesPage.attendanceRsvpClosedTraining,
            forbidden: t.activitiesPage.attendanceRsvpPermissionDenied,
            notInvited: t.activitiesPage.attendanceNotInvited,
            reasonRequired: t.activitiesPage.attendanceReasonRequired,
            failed: t.activitiesPage.attendanceRsvpFailed,
          })
        : isRlsOrPermissionError(err)
          ? t.activitiesPage.attendanceRsvpPermissionDenied
          : formatSupabaseError(err) || t.activitiesPage.attendanceRsvpFailed;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setRsvpBusyId(null);
    }
  };

  const markAttended = async (activityId: string, membershipId: string) => {
    setMarkAttendedBusyId(membershipId);
    try {
      const result = await upsertActivityAttendanceResponse({
        activityId,
        membershipId,
        status: "attended",
      });
      if (!result.ok) throw new Error(result.error || "mark_failed");
      toast({ title: t.activitiesPage.attendanceMarkedAttended });
      await fetchData();
    } catch (err: unknown) {
      toast({
        title: t.common.error,
        description: formatSupabaseError(err) || t.activitiesPage.attendanceRsvpFailed,
        variant: "destructive",
      });
    } finally {
      setMarkAttendedBusyId(null);
    }
  };

  const sendMissingReminders = async (activityId: string) => {
    setRemindBusyId(activityId);
    try {
      const result = await remindMissingActivityAttendance({ activityId });
      if (!result.ok) throw new Error(result.error || "remind_failed");
      toast({
        title: t.activitiesPage.attendanceRemindSent,
        description: t.activitiesPage.attendanceRemindSentDesc
          .replace("{sent}", String(result.sent))
          .replace("{skipped}", String(result.skipped)),
      });
    } catch (err: unknown) {
      toast({
        title: t.common.error,
        description: formatSupabaseError(err) || t.activitiesPage.attendanceRemindFailed,
        variant: "destructive",
      });
    } finally {
      setRemindBusyId(null);
    }
  };

  const rsvpLabels = useMemo(
    () => ({
      coming: t.activitiesPage.attendanceComing,
      notComing: t.activitiesPage.attendanceNotComing,
      maybe: t.activitiesPage.attendanceMaybe,
      changeResponse: t.activitiesPage.attendanceYourResponse,
      statusComing: t.activitiesPage.attendanceStatusComing,
      statusNotComing: t.activitiesPage.attendanceStatusNotComing,
      statusMaybe: t.activitiesPage.attendanceStatusMaybe,
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
      tabMaybe: t.activitiesPage.attendanceMaybe,
      tabPending: t.activitiesPage.attendanceTabPending,
      nudge: t.activitiesPage.attendanceNudge,
      remindMissing: t.activitiesPage.attendanceRemindMissing,
      noPlayers: t.activitiesPage.attendanceNoPlayers,
      reasonPrefix: t.activitiesPage.attendanceReasonPrefix,
      rosterScopeTeam: t.activitiesPage.attendanceRosterTeam,
      rosterScopeClub: t.activitiesPage.attendanceRosterClub,
      nudgeFootnote: t.activitiesPage.attendanceNudgeFootnote,
      copyList: t.activitiesPage.attendanceCopyList,
      markAttended: t.activitiesPage.attendanceMarkAttended,
    }),
    [t],
  );

  function personLabel(row: EditableMemberMasterRow): string {
    const name = row.display_name?.trim() || row.membership_id.slice(0, 8);
    const rel = row.relationship?.trim().toLowerCase();
    if (rel === "guardian") return `${name} (${t.myMemberDataPage.relationshipGuardian})`;
    if (rel === "self" || row.edit_actor === "self") return `${name} (${t.myMemberDataPage.relationshipSelf})`;
    return name;
  }

  function availabilityHintForActivity(activity: ActivityRow): string | null {
    if (!activeRsvpMembershipId) return null;
    const overlaps = findOverlappingAvailability({
      activityStartsAt: activity.starts_at,
      activityEndsAt: activity.ends_at,
      rows: availabilityRows.filter((row) => row.membership_id === activeRsvpMembershipId),
    });
    if (!overlaps.length) return null;
    const suggested = suggestedRsvpFromAvailability(overlaps);
    const detail = availabilityHintLabel(overlaps[0]!);
    const suggestKey =
      suggested === "confirmed"
        ? t.activitiesPage.availabilitySuggestComing
        : suggested === "declined"
          ? t.activitiesPage.availabilitySuggestDeclined
          : suggested === "maybe"
            ? t.activitiesPage.availabilitySuggestMaybe
            : null;
    return suggestKey
      ? t.activitiesPage.availabilityHintWithSuggest.replace("{detail}", detail).replace("{suggest}", suggestKey)
      : t.activitiesPage.availabilityHint.replace("{detail}", detail);
  }

  return (
    <div className={DASHBOARD_PAGE_ROOT} data-testid="activities-page">
      <DashboardHeaderSlot
        title={t.activitiesPage.title}
        subtitle={perms.isTrainer ? t.activitiesPage.subtitleTrainer : t.activitiesPage.subtitlePlayer}
        toolbarRevision={`${perms.isTrainer}-${canCreate}`}
        rightSlot={
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-end">
            {!isPlayerFocusedView ? <AiAgentHeaderButton intent="summarize_missing_rsvps" /> : null}
            {perms.isTrainer && (
              <Button size="sm" variant="outline" className="rounded-2xl text-xs sm:text-sm shrink-0" onClick={createWeekTemplate} disabled={!clubId}>
                <Sparkles className="w-4 h-4 mr-1" /> {t.activitiesPage.weekTemplate}
              </Button>
            )}
            {canCreate ? (
              <Button
                size="sm"
                data-testid="activities-create-open"
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
            {rsvpPeople.length > 1 ? (
              <div
                className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4"
                data-testid="attendance-rsvp-responding-for"
              >
                <div className="text-xs text-muted-foreground mb-2">{t.activitiesPage.rsvpRespondingAs}</div>
                <Select
                  value={activeRsvpMembershipId || "__none"}
                  onValueChange={(value) => setRsvpParticipantId(value === "__none" ? null : value)}
                >
                  <SelectTrigger className="h-10 w-full sm:max-w-sm rounded-xl border-border/60 bg-background/40 px-3 text-sm">
                    <SelectValue placeholder={t.activitiesPage.rsvpRespondingAs} />
                  </SelectTrigger>
                  <SelectContent>
                    {rsvpPeople.map((person) => (
                      <SelectItem key={person.membership_id} value={person.membership_id}>
                        {personLabel(person)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-[11px] text-muted-foreground">{t.activitiesPage.rsvpRespondingAsHint}</p>
              </div>
            ) : null}

            {/* Filters */}
            <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="w-4 h-4" /> {t.activitiesPage.filtersLabel}
                </div>
                {isPlayerFocusedView ? (
                  <p className="text-[11px] text-muted-foreground">{t.activitiesPage.playerHint}</p>
                ) : perms.isTrainer ? (
                  <div className="text-[11px] text-muted-foreground">
                    {t.activitiesPage.weekTemplateTip.replace("{template}", t.activitiesPage.weekTemplate)}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {([
                  { id: "all" as const, label: t.activitiesPage.filterAll },
                  { id: "training" as const, label: t.activitiesPage.filterTraining },
                  { id: "match" as const, label: t.activitiesPage.filterMatch },
                  { id: "event" as const, label: t.activitiesPage.filterEvent },
                ]).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterType(chip.id as ActivityType | "all")}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      filterType === chip.id
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}

                {!isPlayerFocusedView || playerTeamOptions.length > 1 ? (
                  <Select value={filterTeamId || "__all"} onValueChange={(value) => setFilterTeamId(value === "__all" ? "" : value)}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-xl border-border/60 bg-background/40 px-3 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!isPlayerFocusedView ? <SelectItem value="__all">{t.activitiesPage.allTeams}</SelectItem> : null}
                      {(isPlayerFocusedView ? playerTeamOptions : teams).map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {!isPlayerFocusedView ? (
                <button
                  onClick={() => setFilterMine((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                    filterMine ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                  }`}
                >
                  {t.activitiesPage.mySessions}
                </button>
                ) : null}

                {perms.isTrainer ? (
                  <button
                    onClick={() => setFilterNeedsResponse((v) => !v)}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      filterNeedsResponse ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                    }`}
                  >
                    {t.activitiesPage.filterNeedsResponse}
                  </button>
                ) : null}

                <button
                  onClick={() => setFilterShowPast((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                    filterShowPast ? "bg-primary/10 text-primary border-primary/20" : "bg-background/40 text-foreground border-border/60"
                  }`}
                >
                  {t.activitiesPage.showPast}
                </button>
              </div>
            </div>

            {/* List */}
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">{t.activitiesPage.nothingScheduled}</h2>
                <p className="text-muted-foreground">{t.activitiesPage.emptyWeekHint}</p>
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
                      const invited =
                        !sum?.lines.length ||
                        Boolean(my) ||
                        (activeRsvpMembershipId
                          ? sum.lines.some((line) => line.membershipId === activeRsvpMembershipId)
                          : false);
                      const availabilityHint = showAttendance ? availabilityHintForActivity(a) : null;
                      const deadlineLabel = a.response_deadline
                        ? new Date(a.response_deadline).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : null;

                      return (
                        <motion.div
                          key={a.id}
                          data-testid="activity-card"
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
                                {a.capacity ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    {t.activitiesPage.capacityLabel.replace("{count}", String(a.capacity))}
                                  </span>
                                ) : null}
                                {clubId && perms.isTrainer && showAttendance ? (
                                  <ActivityReadinessBadge
                                    clubId={clubId}
                                    activityId={a.id}
                                    teamId={a.team_id}
                                    canManage={perms.isTrainer}
                                    labels={{
                                      ready: t.activitiesPage.readinessBadge,
                                      spawnSetup: t.activitiesPage.readinessSpawn,
                                      spawned: t.activitiesPage.readinessSpawned,
                                      failed: t.activitiesPage.readinessFailed,
                                    }}
                                    onToast={(payload) => toast(payload)}
                                  />
                                ) : null}
                              </div>

                              <div className="mt-1 font-display text-lg font-bold text-foreground">{a.title}</div>
                              {deadlineLabel ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {t.activitiesPage.responseDeadlineLabel}: {deadlineLabel}
                                  {a.response_required ? ` · ${t.activitiesPage.responseRequiredShort}` : ""}
                                </p>
                              ) : null}
                            </div>

                            {perms.isTrainer && showAttendance ? (
                              <Button size="sm" variant="outline" className="shrink-0 rounded-2xl" onClick={() => openDrawer(a.id)}>
                                <PanelRight className="mr-1.5 h-4 w-4" />
                                {t.activitiesPage.attendanceViewRoster}
                              </Button>
                            ) : null}
                          </div>

                          {showAttendance ? (
                            <ActivityOpsTabs
                              showTransport={Boolean(
                                clubId && canUseCarpoolGuests && (a.type === "match" || a.type === "training"),
                              )}
                              showGuests={Boolean(
                                clubId && canUseCarpoolGuests && (perms.isTrainer || perms.isAdmin),
                              )}
                              labels={{
                                attendance: t.activitiesPage.opsTabAttendance,
                                transport: t.activitiesPage.opsTabTransport,
                                guests: t.activitiesPage.opsTabGuests,
                              }}
                              attendance={
                                <>
                                  {sum && perms.isTrainer ? (
                                    <TrainingAttendanceOverview
                                      overview={sum}
                                      labels={{
                                        sectionTitle: t.activitiesPage.attendanceTeamOverview,
                                        summaryHeadline: t.activitiesPage.attendanceSummaryHeadline,
                                        statComing: t.activitiesPage.attendanceStatComing,
                                        statDeclined: t.activitiesPage.attendanceStatDeclined,
                                        statPending: t.activitiesPage.attendanceStatPending,
                                        comingList: t.activitiesPage.attendanceComingList,
                                        declinedList: t.activitiesPage.attendanceDeclinedList,
                                        noResponsesYet: t.activitiesPage.attendanceNoRosterYet,
                                      }}
                                    />
                                  ) : null}

                                  {activeRsvpMembershipId && invited ? (
                                    <>
                                      {availabilityHint ? (
                                        <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                                          {availabilityHint}
                                        </p>
                                      ) : null}
                                      <TrainingAttendanceRsvp
                                        activityTitle={a.title}
                                        myAttendance={my}
                                        busy={rsvpBusyId === a.id}
                                        rsvpClosed={
                                          !isActivityRsvpOpen({
                                            type: a.type,
                                            startsAt: a.starts_at,
                                            responseDeadline: a.response_deadline,
                                          })
                                        }
                                        rsvpClosedMessage={t.activitiesPage.attendanceRsvpClosedTraining}
                                        onRespond={(status, notes, reason) => rsvp(a.id, status, notes, reason)}
                                        labels={rsvpLabels}
                                      />
                                    </>
                                  ) : null}

                                  {activeRsvpMembershipId && !invited ? (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                      {t.activitiesPage.attendanceNotInvited}
                                    </p>
                                  ) : null}
                                </>
                              }
                              transport={
                                clubId ? (
                                  <ActivityTransportPanel
                                    clubId={clubId}
                                    activityId={a.id}
                                    membershipId={membershipId}
                                    labels={{
                                      title: t.activitiesPage.transportTitle,
                                      offer: t.activitiesPage.transportOffer,
                                      seats: t.activitiesPage.transportSeats,
                                      meetingPoint: t.activitiesPage.transportMeetingPoint,
                                      empty: t.activitiesPage.transportEmpty,
                                      request: t.activitiesPage.transportRequest,
                                      remaining: t.activitiesPage.transportRemaining,
                                      saved: t.activitiesPage.transportSaved,
                                      failed: t.activitiesPage.transportFailed,
                                      summaryOffered: t.activitiesPage.transportSummaryOffered,
                                      summaryAssigned: t.activitiesPage.transportSummaryAssigned,
                                      summaryPending: t.activitiesPage.transportSummaryPending,
                                      summaryOpen: t.activitiesPage.transportSummaryOpen,
                                      pendingRequests: t.activitiesPage.transportPendingRequests,
                                      accept: t.activitiesPage.transportAccept,
                                      decline: t.activitiesPage.transportDecline,
                                      requestPending: t.activitiesPage.transportRequestPending,
                                    }}
                                    onToast={(payload) => toast(payload)}
                                  />
                                ) : null
                              }
                              guests={
                                clubId ? (
                                  <ActivityGuestsPanel
                                    clubId={clubId}
                                    activityId={a.id}
                                    canConvert={canConvertGuests}
                                    labels={{
                                      title: t.activitiesPage.guestsTitle,
                                      add: t.activitiesPage.guestsAdd,
                                      name: t.activitiesPage.guestsName,
                                      email: t.activitiesPage.guestsEmail,
                                      empty: t.activitiesPage.guestsEmpty,
                                      saved: t.activitiesPage.guestsSaved,
                                      failed: t.activitiesPage.guestsFailed,
                                      linkExisting: t.activitiesPage.guestsLinkExisting,
                                      createDraftInvite: t.activitiesPage.guestsCreateDraftInvite,
                                      converted: t.activitiesPage.guestsConverted,
                                      pickMember: t.activitiesPage.guestsPickMember,
                                      convertDone: t.activitiesPage.guestsConvertDone,
                                    }}
                                    onToast={(payload) => toast(payload)}
                                  />
                                ) : null
                              }
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
              <div className="font-display font-bold text-foreground">{t.activitiesPage.newActivityTitle}</div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                {t.common.close}
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.activitiesPage.phTitleLabel}</div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.activitiesPage.phTitle} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["training", "event", "match"] as ActivityType[]).map((activityType) => (
                  <button
                    key={activityType}
                    onClick={() => setType(activityType)}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                      type === activityType
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {activityType}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.activitiesPage.teamOptional}</div>
                <Select value={teamId || "__none"} onValueChange={(value) => setTeamId(value === "__none" ? "" : value)}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-border/60 bg-background/50 px-3 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t.activitiesPage.noTeam}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">{t.activitiesPage.startsAtLabel}</div>
                <Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder={t.placeholders.dateTimeLocal} />
                <div className="mt-1 text-[10px] text-muted-foreground">{t.activitiesPage.startsAtParseHint}</div>
              </div>

              {(type === "training" || type === "match") ? (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t.activitiesPage.responseDeadlineLabel}</div>
                    <Input
                      type="datetime-local"
                      value={responseDeadline}
                      onChange={(e) => setResponseDeadline(e.target.value)}
                    />
                    <div className="mt-1 text-[10px] text-muted-foreground">{t.activitiesPage.responseDeadlineHint}</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <Checkbox
                      checked={responseRequired}
                      onCheckedChange={(checked) => setResponseRequired(checked === true)}
                    />
                    {t.activitiesPage.responseRequiredLabel}
                  </label>
                  {responseRequired ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t.activitiesPage.customReminderLabel}</div>
                      <Input
                        type="datetime-local"
                        value={customReminderAt}
                        onChange={(e) => setCustomReminderAt(e.target.value)}
                      />
                      <div className="mt-1 text-[10px] text-muted-foreground">{t.activitiesPage.customReminderHint}</div>
                    </div>
                  ) : null}
                </>
              ) : null}

              <Button className="bg-gradient-gold-static text-primary-foreground font-semibold" onClick={handleCreate}>
                {t.activitiesPage.createActivitySubmit}
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
          onRemindMissing={() => void sendMissingReminders(drawerActivity.id)}
          onMarkAttended={(membershipId) => void markAttended(drawerActivity.id, membershipId)}
          markBusyId={markAttendedBusyId}
          remindBusy={remindBusyId === drawerActivity.id}
          labels={trainerPanelLabels}
        />
      ) : null}
    </div>
  );
}
