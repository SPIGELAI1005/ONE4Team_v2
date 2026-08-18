import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { checklistProgress } from "@/lib/club-task-coordination";

export type ActivityReadinessSummary = {
  taskCount: number;
  doneItems: number;
  totalItems: number;
  percent: number;
};

export async function fetchActivityReadinessSummaries(input: {
  clubId: string;
  activityIds: string[];
}): Promise<{ data: Record<string, ActivityReadinessSummary>; error: Error | null }> {
  if (!input.activityIds.length) return { data: {}, error: null };

  const tasksRes = await supabaseDynamic
    .from("club_tasks")
    .select("id, activity_id")
    .eq("club_id", input.clubId)
    .in("activity_id", input.activityIds);

  const tasksError = (tasksRes as { error?: { message?: string } | null }).error;
  const tasks = (tasksRes as { data?: Array<{ id: string; activity_id: string | null }> }).data ?? [];
  if (tasksError) return { data: {}, error: new Error(tasksError.message || "load_failed") };

  const taskIds = tasks.map((t) => t.id);
  if (!taskIds.length) return { data: {}, error: null };

  const itemsRes = await supabaseDynamic
    .from("club_task_checklist_items")
    .select("task_id, is_done")
    .eq("club_id", input.clubId)
    .in("task_id", taskIds);

  const itemsError = (itemsRes as { error?: { message?: string } | null }).error;
  const items = (itemsRes as { data?: Array<{ task_id: string; is_done: boolean }> }).data ?? [];
  if (itemsError) return { data: {}, error: new Error(itemsError.message || "load_failed") };

  const itemsByTask: Record<string, Array<{ is_done: boolean }>> = {};
  for (const item of items) {
    (itemsByTask[item.task_id] ??= []).push({ is_done: item.is_done });
  }

  const tasksByActivity: Record<string, string[]> = {};
  for (const task of tasks) {
    if (!task.activity_id) continue;
    (tasksByActivity[task.activity_id] ??= []).push(task.id);
  }

  const data: Record<string, ActivityReadinessSummary> = {};
  for (const activityId of input.activityIds) {
    const linkedTaskIds = tasksByActivity[activityId] ?? [];
    let doneItems = 0;
    let totalItems = 0;
    for (const taskId of linkedTaskIds) {
      const progress = checklistProgress(
        (itemsByTask[taskId] ?? []).map((row, index) => ({
          id: `${taskId}-${index}`,
          task_id: taskId,
          club_id: input.clubId,
          title: "",
          is_done: row.is_done,
          sort_order: index,
          created_at: "",
          updated_at: "",
        })),
      );
      doneItems += progress.done;
      totalItems += progress.total;
    }
    data[activityId] = {
      taskCount: linkedTaskIds.length,
      doneItems,
      totalItems,
      percent: totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : linkedTaskIds.length > 0 ? 0 : 100,
    };
  }

  return { data, error: null };
}
