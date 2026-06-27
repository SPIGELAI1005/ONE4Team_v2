import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicClub } from "@/contexts/public-club-context";
import { supabase } from "@/integrations/supabase/client";
import {
  publicClubRsvpTargetFromMatch,
  publicClubRsvpTargetFromTraining,
  resolvePublicClubRsvpActivityId,
  type PublicClubRsvpTarget,
  type RsvpActivityLite,
} from "@/lib/public-club-attendance";
import type { PublicMatchLite, TrainingSessionRowLite } from "@/lib/public-club-models";
import {
  buildActivityAttendanceOverview,
  buildActivityRoster,
  isMemberInvitedToActivity,
  isTrainingRsvpOpen,
  type ActivityAttendanceOverview,
  type TrainingAttendanceRow,
} from "@/lib/training-attendance";

type AttendanceRow = TrainingAttendanceRow & { club_id: string };

type MembershipLite = {
  id: string;
  role: string;
  status: string;
  profiles: { display_name: string | null } | null;
};

type TeamPlayerLite = {
  team_id: string;
  membership_id: string;
  jersey_number: number | null;
};

const ROSTER_FETCH_CAP = 800;

export function usePublicClubAttendanceState() {
  const { club, user, isMember, membershipId } = usePublicClub();
  const [rsvpActivities, setRsvpActivities] = useState<RsvpActivityLite[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<TrainingAttendanceRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipLite[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayerLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);

  const canRsvp = Boolean(club?.id && user && isMember && membershipId);

  const reload = useCallback(async () => {
    if (!club?.id || !membershipId || !isMember) {
      setRsvpActivities([]);
      setAttendance([]);
      setTeamAttendance([]);
      setMemberships([]);
      setTeamPlayers([]);
      return;
    }

    setLoading(true);
    try {
      const pastIso = new Date(Date.now() - 2 * 86400000).toISOString();
      const futureIso = new Date(Date.now() + 120 * 86400000).toISOString();

      const { data: acts, error: actsErr } = await supabase
        .from("activities")
        .select("id, type, title, starts_at, team_id")
        .eq("club_id", club.id)
        .in("type", ["training", "match"])
        .gte("starts_at", pastIso)
        .lte("starts_at", futureIso)
        .order("starts_at", { ascending: true })
        .limit(400);

      if (actsErr) throw actsErr;

      const activityRows = ((acts as RsvpActivityLite[]) ?? []).filter(
        (a) => a.type === "training" || a.type === "match",
      );
      const activityIds = activityRows.map((a) => a.id);
      const teamIds = [...new Set(activityRows.map((a) => a.team_id).filter(Boolean))] as string[];

      const [
        { data: myAtt, error: myAttErr },
        { data: allAtt, error: allAttErr },
        { data: ms, error: msErr },
        { data: tp, error: tpErr },
      ] = await Promise.all([
        supabase
          .from("activity_attendance")
          .select("id, club_id, activity_id, membership_id, status, notes")
          .eq("club_id", club.id)
          .eq("membership_id", membershipId)
          .order("updated_at", { ascending: false })
          .limit(500),
        activityIds.length
          ? supabase
              .from("activity_attendance")
              .select("id, activity_id, membership_id, status, notes")
              .eq("club_id", club.id)
              .in("activity_id", activityIds)
          : Promise.resolve({ data: [] as TrainingAttendanceRow[], error: null }),
        supabase
          .from("club_memberships")
          .select("id, role, status, profiles!club_memberships_profile_fk(display_name)")
          .eq("club_id", club.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(ROSTER_FETCH_CAP),
        teamIds.length
          ? supabase.from("team_players").select("team_id, membership_id, jersey_number").in("team_id", teamIds)
          : Promise.resolve({ data: [] as TeamPlayerLite[], error: null }),
      ]);

      if (myAttErr) throw myAttErr;
      if (allAttErr) throw allAttErr;
      if (msErr) throw msErr;
      if (tpErr) throw tpErr;

      setRsvpActivities(activityRows);
      setAttendance((myAtt as AttendanceRow[]) ?? []);
      setTeamAttendance((allAtt as TrainingAttendanceRow[]) ?? []);
      setMemberships((ms as MembershipLite[]) ?? []);
      setTeamPlayers((tp as TeamPlayerLite[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [club?.id, isMember, membershipId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const attendanceByActivityId = useMemo(() => {
    const map: Record<string, AttendanceRow> = {};
    for (const row of attendance) map[row.activity_id] = row;
    return map;
  }, [attendance]);

  const rosterMemberships = useMemo(
    () =>
      memberships.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        displayName: m.profiles?.display_name?.trim() || m.id.slice(0, 8),
      })),
    [memberships],
  );

  const overviewByActivityId = useMemo(() => {
    const map: Record<string, ActivityAttendanceOverview> = {};

    for (const activity of rsvpActivities) {
      const roster = buildActivityRoster({
        teamId: activity.team_id,
        memberships: rosterMemberships,
        teamPlayers,
      });
      const rows = teamAttendance.filter((row) => row.activity_id === activity.id);
      map[activity.id] = buildActivityAttendanceOverview({ roster, attendanceRows: rows });
    }

    return map;
  }, [rsvpActivities, rosterMemberships, teamAttendance, teamPlayers]);

  const resolveActivityId = useCallback(
    (target: PublicClubRsvpTarget) => resolvePublicClubRsvpActivityId(target, rsvpActivities),
    [rsvpActivities],
  );

  const resolveTrainingActivityId = useCallback(
    (session: TrainingSessionRowLite) =>
      resolvePublicClubRsvpActivityId(publicClubRsvpTargetFromTraining(session), rsvpActivities),
    [rsvpActivities],
  );

  const resolveMatchActivityId = useCallback(
    (match: PublicMatchLite, clubName: string) =>
      resolvePublicClubRsvpActivityId(publicClubRsvpTargetFromMatch({ ...match, clubName }), rsvpActivities),
    [rsvpActivities],
  );

  const getActivityOverview = useCallback(
    (activityId: string) => overviewByActivityId[activityId] ?? null,
    [overviewByActivityId],
  );

  const canMemberRespond = useCallback(
    (activityId: string) => {
      if (!membershipId) return false;
      const existing = attendanceByActivityId[activityId] ?? null;
      if (existing) return true;
      const activity = rsvpActivities.find((a) => a.id === activityId);
      if (!activity) return false;
      const roster = buildActivityRoster({
        teamId: activity.team_id,
        memberships: rosterMemberships,
        teamPlayers,
      });
      return isMemberInvitedToActivity(membershipId, roster, existing);
    },
    [attendanceByActivityId, membershipId, rosterMemberships, rsvpActivities, teamPlayers],
  );

  const isRsvpOpenForTarget = useCallback(
    (target: PublicClubRsvpTarget) => {
      if (target.kind === "match") return true;
      return isTrainingRsvpOpen(target.startsAt);
    },
    [],
  );

  const respond = useCallback(
    async (activityId: string, status: "confirmed" | "declined", notes?: string | null) => {
      if (!club?.id || !membershipId) return;

      const activity = rsvpActivities.find((a) => a.id === activityId);
      if (activity?.type === "training" && !isTrainingRsvpOpen(activity.starts_at)) {
        throw new Error("RSVP window closed");
      }

      if (!canMemberRespond(activityId)) {
        throw new Error("Not invited");
      }

      setBusyActivityId(activityId);
      try {
        const existing = attendanceByActivityId[activityId];
        const payload = {
          status,
          notes: status === "declined" ? notes?.trim() || null : null,
        };

        if (existing) {
          const { error } = await supabase
            .from("activity_attendance")
            .update(payload)
            .eq("club_id", club.id)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("activity_attendance").insert({
            club_id: club.id,
            activity_id: activityId,
            membership_id: membershipId,
            ...payload,
          });
          if (error) throw error;
        }

        await reload();
      } finally {
        setBusyActivityId(null);
      }
    },
    [attendanceByActivityId, canMemberRespond, club?.id, membershipId, reload, rsvpActivities],
  );

  return {
    canRsvp,
    loading,
    busyActivityId,
    attendanceByActivityId,
    overviewByActivityId,
    getActivityOverview,
    canMemberRespond,
    isRsvpOpenForTarget,
    resolveActivityId,
    resolveTrainingActivityId,
    resolveMatchActivityId,
    respond,
    reload,
  };
}
