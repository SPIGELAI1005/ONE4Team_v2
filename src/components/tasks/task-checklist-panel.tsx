import { useCallback, useEffect, useState } from "react";
import { CheckSquare, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  addTaskChecklistItem,
  deleteTaskChecklistItem,
  listTaskChecklistItems,
  setTaskChecklistItemDone,
} from "@/lib/club-task-coordination-api";
import {
  checklistProgress,
  type ClubTaskChecklistItem,
} from "@/lib/club-task-coordination";
import { supabase } from "@/integrations/supabase/client";

interface TaskChecklistPanelProps {
  clubId: string;
  taskId: string;
  userId: string | null;
  canManage: boolean;
  labels: {
    title: string;
    add: string;
    empty: string;
    progress: string;
    failed: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

export function TaskChecklistPanel({
  clubId,
  taskId,
  userId,
  canManage,
  labels,
  onToast,
}: TaskChecklistPanelProps) {
  const [items, setItems] = useState<ClubTaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listTaskChecklistItems({ clubId, taskId });
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      setItems([]);
    } else {
      setItems(data);
    }
    setLoading(false);
  }, [clubId, labels.failed, onToast, taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!clubId || !taskId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void reload();
      }, 350);
    };
    const channel = supabase
      .channel(`task-checklist-${clubId}-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_task_checklist_items",
          filter: `task_id=eq.${taskId}`,
        },
        schedule,
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [clubId, reload, taskId]);

  const progress = checklistProgress(items);

  async function handleAdd() {
    if (!draft.trim()) return;
    setBusy(true);
    const { error } = await addTaskChecklistItem({
      clubId,
      taskId,
      title: draft,
      sortOrder: items.length,
    });
    setBusy(false);
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    await reload();
  }

  async function handleToggle(item: ClubTaskChecklistItem, isDone: boolean) {
    const { error } = await setTaskChecklistItemDone({
      itemId: item.id,
      clubId,
      isDone,
      userId,
    });
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      return;
    }
    await reload();
  }

  async function handleDelete(itemId: string) {
    const { error } = await deleteTaskChecklistItem({ itemId, clubId });
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      return;
    }
    await reload();
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-background/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CheckSquare className="h-3.5 w-3.5" />
          {labels.title}
        </div>
        {progress.total > 0 ? (
          <span className="text-[10px] text-muted-foreground">
            {labels.progress.replace("{done}", String(progress.done)).replace("{total}", String(progress.total))}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <Checkbox
                checked={item.is_done}
                onCheckedChange={(checked) => void handleToggle(item, checked === true)}
                className="mt-0.5"
              />
              <span
                className={`min-w-0 flex-1 text-sm ${item.is_done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {item.title}
              </span>
              {canManage ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => void handleDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-3 flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={labels.add}
            className="h-9 rounded-xl text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button type="button" size="sm" className="rounded-xl shrink-0" disabled={busy} onClick={() => void handleAdd()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
