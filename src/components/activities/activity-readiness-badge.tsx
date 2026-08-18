import { useCallback, useEffect, useState } from "react";
import { CheckSquare, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchActivityReadinessSummaries, type ActivityReadinessSummary } from "@/lib/activity-readiness-api";
import {
  ensureStarterTaskTemplates,
  listClubTaskTemplates,
  spawnClubTaskFromTemplate,
} from "@/lib/club-task-templates-api";

interface ActivityReadinessBadgeProps {
  clubId: string;
  activityId: string;
  teamId: string | null;
  canManage: boolean;
  labels: {
    ready: string;
    spawnSetup: string;
    spawned: string;
    failed: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

export function ActivityReadinessBadge({
  clubId,
  activityId,
  teamId,
  canManage,
  labels,
  onToast,
}: ActivityReadinessBadgeProps) {
  const [summary, setSummary] = useState<ActivityReadinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchActivityReadinessSummaries({
      clubId,
      activityIds: [activityId],
    });
    if (error) {
      setSummary(null);
    } else {
      setSummary(data[activityId] ?? null);
    }
    setLoading(false);
  }, [activityId, clubId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSpawn() {
    setBusy(true);
    await ensureStarterTaskTemplates(clubId);
    const templates = await listClubTaskTemplates(clubId);
    const template = templates.data.find((row) => row.key === "matchday_setup") ?? templates.data[0];
    if (!template) {
      setBusy(false);
      onToast({ title: labels.failed, variant: "destructive" });
      return;
    }
    const { data: task, error } = await spawnClubTaskFromTemplate({
      clubId,
      template,
      teamId,
      activityId,
    });
    setBusy(false);
    if (error || !task) {
      onToast({ title: labels.failed, description: error?.message, variant: "destructive" });
      return;
    }
    onToast({ title: labels.spawned });
    await reload();
  }

  if (loading) return null;
  if (!summary && !canManage) return null;

  if (!summary || summary.taskCount === 0) {
    if (!canManage) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-lg px-2 text-[10px]"
        disabled={busy}
        data-testid="activity-spawn-checklist"
        onClick={() => void handleSpawn()}
      >
        {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
        {labels.spawnSetup}
      </Button>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
      data-testid="activity-readiness-badge"
    >
      <CheckSquare className="h-3 w-3" />
      {labels.ready.replace("{percent}", String(summary.percent)).replace(
        "{done}",
        String(summary.doneItems),
      ).replace("{total}", String(summary.totalItems))}
    </span>
  );
}
