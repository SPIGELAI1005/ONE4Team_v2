import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type {
  ClubTaskAssigneeOption,
  ClubTaskPartnerOption,
  ClubTaskRow,
  ClubTaskStatus,
} from "@/lib/club-task-models";
import { clubTaskStatusOnComplete, isClubTaskOpen } from "@/lib/club-task-models";

export type ClubTaskFilter = "all" | "mine" | "overdue";

const TASK_SELECT =
  "id, club_id, title, description, status, priority, due_at, team_id, assignee_user_id, partner_id, source_type, source_id, created_by, completed_at, created_at, updated_at";

export function useClubTasks(clubId: string | null, filter: ClubTaskFilter = "all") {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ClubTaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clubId || !user) {
      setTasks([]);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("club_tasks")
      .select(TASK_SELECT)
      .eq("club_id", clubId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "mine") {
      query = query.eq("assignee_user_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      setTasks([]);
    } else {
      let rows = (data ?? []) as ClubTaskRow[];
      if (filter === "overdue") {
        const now = Date.now();
        rows = rows.filter((row) => {
          if (!row.due_at || !isClubTaskOpen(row.status)) return false;
          return new Date(row.due_at).getTime() < now;
        });
      }
      setTasks(rows);
    }
    setLoading(false);
  }, [clubId, filter, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!clubId || !user) return;

    const channel = supabase
      .channel(`club-tasks-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_tasks", filter: `club_id=eq.${clubId}` },
        () => {
          void reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clubId, reload, user]);

  const myOpenCount = tasks.filter(
    (row) => row.assignee_user_id === user?.id && isClubTaskOpen(row.status),
  ).length;

  return { tasks, loading, reload, myOpenCount };
}

export function useClubTaskOptions(clubId: string | null) {
  const [assignees, setAssignees] = useState<ClubTaskAssigneeOption[]>([]);
  const [partners, setPartners] = useState<ClubTaskPartnerOption[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clubId) {
      setAssignees([]);
      setPartners([]);
      setTeams([]);
      return;
    }
    setLoading(true);
    const [membersRes, partnersRes, teamsRes] = await Promise.all([
      supabase
        .from("club_memberships")
        .select("user_id, role, profiles(display_name)")
        .eq("club_id", clubId)
        .eq("status", "active")
        .not("user_id", "is", null)
        .order("role"),
      supabase.from("partners").select("id, name, partner_type").eq("club_id", clubId).order("name"),
      supabase.from("teams").select("id, name").eq("club_id", clubId).order("name"),
    ]);

    setAssignees(
      ((membersRes.data ?? []) as Array<{
        user_id: string;
        role: string;
        profiles: { display_name: string | null } | null;
      }>).map((row) => ({
        user_id: row.user_id,
        role: row.role,
        label: row.profiles?.display_name?.trim() || row.role,
      })),
    );
    setPartners((partnersRes.data ?? []) as ClubTaskPartnerOption[]);
    setTeams((teamsRes.data ?? []) as { id: string; name: string }[]);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { assignees, partners, teams, loading, reload };
}

export async function createClubTask(
  clubId: string,
  payload: {
    title: string;
    description?: string;
    priority: ClubTaskRow["priority"];
    due_at?: string | null;
    team_id?: string | null;
    assignee_user_id?: string | null;
    partner_id?: string | null;
  },
): Promise<{ data: ClubTaskRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("club_tasks")
    .insert({
      club_id: clubId,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      priority: payload.priority,
      due_at: payload.due_at || null,
      team_id: payload.team_id || null,
      assignee_user_id: payload.assignee_user_id || null,
      partner_id: payload.partner_id || null,
      source_type: "manual",
    })
    .select(TASK_SELECT)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as ClubTaskRow, error: null };
}

export async function updateClubTask(
  taskId: string,
  clubId: string,
  patch: Partial<
    Pick<
      ClubTaskRow,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "due_at"
      | "team_id"
      | "assignee_user_id"
      | "partner_id"
      | "completed_at"
    >
  >,
): Promise<{ error: Error | null }> {
  const statusPatch =
    patch.status !== undefined ? clubTaskStatusOnComplete(patch.status as ClubTaskStatus) : {};
  const { error } = await supabase
    .from("club_tasks")
    .update({ ...patch, ...statusPatch })
    .eq("id", taskId)
    .eq("club_id", clubId);
  return { error: error ? new Error(error.message) : null };
}

export async function deleteClubTask(taskId: string, clubId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("club_tasks").delete().eq("id", taskId).eq("club_id", clubId);
  return { error: error ? new Error(error.message) : null };
}

export async function fetchMyOpenTaskCount(clubId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("club_tasks")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("assignee_user_id", userId)
    .in("status", ["open", "in_progress"]);
  if (error) return 0;
  return count ?? 0;
}
