import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { ClubTaskChecklistItem } from "@/lib/club-task-coordination";

export async function claimClubTask(taskId: string): Promise<{
  ok: boolean;
  error: string | null;
  already?: boolean;
}> {
  const { data, error } = await supabaseDynamic.rpc("claim_club_task", { _task_id: taskId });
  if (error) return { ok: false, error: error.message || "rpc_failed" };
  const payload = data as { ok?: boolean; error?: string; already?: boolean } | null;
  if (!payload?.ok) return { ok: false, error: payload?.error || "unknown_error" };
  return { ok: true, error: null, already: Boolean(payload.already) };
}

export async function listTaskChecklistItems(input: {
  clubId: string;
  taskId: string;
}): Promise<{ data: ClubTaskChecklistItem[]; error: Error | null }> {
  const result = await supabaseDynamic
    .from("club_task_checklist_items")
    .select("id, club_id, task_id, title, sort_order, is_done, done_by, done_at")
    .eq("club_id", input.clubId)
    .eq("task_id", input.taskId)
    .order("sort_order", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ClubTaskChecklistItem[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

export async function addTaskChecklistItem(input: {
  clubId: string;
  taskId: string;
  title: string;
  sortOrder?: number;
}): Promise<{ data: ClubTaskChecklistItem | null; error: Error | null }> {
  const result = await supabaseDynamic
    .from("club_task_checklist_items")
    .insert({
      club_id: input.clubId,
      task_id: input.taskId,
      title: input.title.trim(),
      sort_order: input.sortOrder ?? 0,
    })
    .select("id, club_id, task_id, title, sort_order, is_done, done_by, done_at")
    .single();

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ClubTaskChecklistItem | null }).data;
  if (error) return { data: null, error: new Error(error.message || "insert_failed") };
  return { data: data ?? null, error: null };
}

export async function setTaskChecklistItemDone(input: {
  itemId: string;
  clubId: string;
  isDone: boolean;
  userId: string | null;
}): Promise<{ error: Error | null }> {
  const result = await supabaseDynamic
    .from("club_task_checklist_items")
    .update({
      is_done: input.isDone,
      done_by: input.isDone ? input.userId : null,
      done_at: input.isDone ? new Date().toISOString() : null,
    })
    .eq("id", input.itemId)
    .eq("club_id", input.clubId);

  const error = (result as { error?: { message?: string } | null }).error;
  return { error: error ? new Error(error.message || "update_failed") : null };
}

export async function deleteTaskChecklistItem(input: {
  itemId: string;
  clubId: string;
}): Promise<{ error: Error | null }> {
  const result = await supabaseDynamic
    .from("club_task_checklist_items")
    .delete()
    .eq("id", input.itemId)
    .eq("club_id", input.clubId);

  const error = (result as { error?: { message?: string } | null }).error;
  return { error: error ? new Error(error.message || "delete_failed") : null };
}
