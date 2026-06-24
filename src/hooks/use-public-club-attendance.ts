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
import type { TrainingAttendanceRow } from "@/lib/training-attendance";

type AttendanceRow = TrainingAttendanceRow & { club_id: string };

export function usePublicClubAttendanceState() {
  const { club, user, isMember, membershipId } = usePublicClub();
  const [rsvpActivities, setRsvpActivities] = useState<RsvpActivityLite[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);

  const canRsvp = Boolean(club?.id && user && isMember && membershipId);

  const reload = useCallback(async () => {
    if (!club?.id || !membershipId || !isMember) {
      setRsvpActivities([]);
      setAttendance([]);
      return;
    }

    setLoading(true);
    try {
      const pastIso = new Date(Date.now() - 2 * 86400000).toISOString();
      const futureIso = new Date(Date.now() + 120 * 86400000).toISOString();

      const [{ data: acts, error: actsErr }, { data: att, error: attErr }] = await Promise.all([
        supabase
          .from("activities")
          .select("id, type, title, starts_at, team_id")
          .eq("club_id", club.id)
          .in("type", ["training", "match"])
          .gte("starts_at", pastIso)
          .lte("starts_at", futureIso)
          .order("starts_at", { ascending: true })
          .limit(400),
        supabase
          .from("activity_attendance")
          .select("id, club_id, activity_id, membership_id, status, notes")
          .eq("club_id", club.id)
          .eq("membership_id", membershipId)
          .order("updated_at", { ascending: false })
          .limit(500),
      ]);

      if (actsErr) throw actsErr;
      if (attErr) throw attErr;

      setRsvpActivities(
        ((acts as RsvpActivityLite[]) ?? []).filter((a) => a.type === "training" || a.type === "match"),
      );
      setAttendance((att as AttendanceRow[]) ?? []);
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

  const respond = useCallback(
    async (activityId: string, status: "confirmed" | "declined", notes?: string | null) => {
      if (!club?.id || !membershipId) return;

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
    [attendanceByActivityId, club?.id, membershipId, reload],
  );

  return {
    canRsvp,
    loading,
    busyActivityId,
    attendanceByActivityId,
    resolveActivityId,
    resolveTrainingActivityId,
    resolveMatchActivityId,
    respond,
    reload,
  };
}
