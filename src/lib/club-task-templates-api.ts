import { createClubTask } from "@/hooks/use-club-tasks";
import { addTaskChecklistItem } from "@/lib/club-task-coordination-api";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  parseChecklistTitles,
  starterSlotsForKey,
  STARTER_TASK_TEMPLATES,
  type ClubTaskTemplateRow,
} from "@/lib/club-task-templates";
import type { ClubTaskRow } from "@/lib/club-task-models";

export async function listClubTaskTemplates(clubId: string): Promise<{
  data: ClubTaskTemplateRow[];
  error: Error | null;
}> {
  const result = await supabaseDynamic
    .from("club_task_templates")
    .select(
      "id, club_id, key, name, title_template, description_template, priority, claimable, checklist_titles",
    )
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  const error = (result as { error?: { message?: string } | null }).error;
  const data = (result as { data?: ClubTaskTemplateRow[] }).data;
  if (error) return { data: [], error: new Error(error.message || "load_failed") };
  return { data: data ?? [], error: null };
}

/** Insert built-in starter templates when the club has none (idempotent per key). */
export async function ensureStarterTaskTemplates(clubId: string): Promise<{
  data: ClubTaskTemplateRow[];
  created: number;
  error: Error | null;
}> {
  const existing = await listClubTaskTemplates(clubId);
  if (existing.error) return { data: [], created: 0, error: existing.error };

  const have = new Set(existing.data.map((t) => t.key));
  const missing = STARTER_TASK_TEMPLATES.filter((t) => !have.has(t.key));
  if (missing.length === 0) {
    return { data: existing.data, created: 0, error: null };
  }

  const result = await supabaseDynamic.from("club_task_templates").insert(
    missing.map((t) => ({
      club_id: clubId,
      key: t.key,
      name: t.name,
      title_template: t.title_template,
      description_template: t.description_template,
      priority: t.priority,
      claimable: t.claimable,
      checklist_titles: t.checklist_titles,
    })),
  );

  const error = (result as { error?: { message?: string } | null }).error;
  if (error) return { data: existing.data, created: 0, error: new Error(error.message || "seed_failed") };

  const refreshed = await listClubTaskTemplates(clubId);
  return { data: refreshed.data, created: missing.length, error: refreshed.error };
}

export async function spawnClubTaskFromTemplate(input: {
  clubId: string;
  template: ClubTaskTemplateRow;
  teamId?: string | null;
  dueAt?: string | null;
  slotsTotal?: number | null;
  activityId?: string | null;
}): Promise<{ data: ClubTaskRow | null; error: Error | null }> {
  const checklist = parseChecklistTitles(input.template.checklist_titles);
  const slots =
    input.slotsTotal !== undefined
      ? input.slotsTotal
      : starterSlotsForKey(input.template.key);

  const { data: task, error } = await createClubTask(input.clubId, {
    title: input.template.title_template,
    description: input.template.description_template ?? undefined,
    priority: input.template.priority,
    due_at: input.dueAt ?? null,
    team_id: input.teamId ?? null,
    claimable: input.template.claimable,
    slots_total: input.template.claimable ? slots : null,
    source_type: input.template.claimable ? "duty" : "manual",
    template_key: input.template.key,
    activity_id: input.activityId ?? null,
  });

  if (error || !task) return { data: null, error: error ?? new Error("spawn_failed") };

  for (let i = 0; i < checklist.length; i++) {
    const item = await addTaskChecklistItem({
      clubId: input.clubId,
      taskId: task.id,
      title: checklist[i],
      sortOrder: i,
    });
    if (item.error) {
      return { data: task, error: item.error };
    }
  }

  return { data: task, error: null };
}
