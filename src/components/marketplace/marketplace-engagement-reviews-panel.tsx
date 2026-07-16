import { useCallback, useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/useAuth";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import type { PartnerTaskRow } from "@/lib/partner-workflow-models";
import { PARTNER_PANEL_CLASS } from "@/lib/partner-workflow-ui";
import { MarketplaceEmptyState } from "@/components/marketplace/marketplace-empty-state";
import { cn } from "@/lib/utils";

interface MarketplaceEngagementReviewsPanelProps {
  clubId: string | null;
}

interface ReviewRow {
  id: string;
  engagement_id: string;
  rating: number;
  comment: string | null;
}

export function MarketplaceEngagementReviewsPanel({ clubId }: MarketplaceEngagementReviewsPanelProps) {
  const { t } = useLanguage();
  const copy = t.marketplacePage.club.reviewsPanel;
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PartnerTaskRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!clubId) {
      setTasks([]);
      setReviews([]);
      return;
    }
    setLoading(true);
    const [tasksRes, reviewsRes] = await Promise.all([
      supabaseDynamic
        .from("partner_tasks")
        .select("*")
        .eq("club_id", clubId)
        .eq("task_status", "done")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabaseDynamic
        .from("marketplace_engagement_reviews")
        .select("id, engagement_id, rating, comment")
        .eq("club_id", clubId)
        .limit(200),
    ]);
    setTasks((tasksRes.data as PartnerTaskRow[]) ?? []);
    setReviews((reviewsRes.data as ReviewRow[]) ?? []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const reviewedIds = new Set(reviews.map((r) => r.engagement_id));
  const pending = tasks.filter((task) => !reviewedIds.has(task.id));

  const submit = async (task: PartnerTaskRow) => {
    if (!clubId || !user) return;
    const rating = ratingDraft[task.id] ?? 5;
    setBusyId(task.id);
    const { error } = await supabaseDynamic.from("marketplace_engagement_reviews").insert({
      club_id: clubId,
      partner_id: task.partner_id,
      engagement_id: task.id,
      rating,
      comment: (commentDraft[task.id] ?? "").trim() || null,
      created_by: user.id,
    });
    setBusyId(null);
    if (error) {
      toast({ title: copy.submitFailed, variant: "destructive" });
      return;
    }
    toast({ title: copy.submitToast });
    void reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {copy.loading}
      </div>
    );
  }

  if (pending.length === 0) {
    return <MarketplaceEmptyState title={copy.emptyTitle} description={copy.emptyDesc} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
      {pending.map((task) => (
        <article key={task.id} className={cn(PARTNER_PANEL_CLASS, "p-4 space-y-3")}>
          <div>
            <h3 className="font-display font-semibold">{task.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{copy.rateHint}</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (ratingDraft[task.id] ?? 5) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  className="p-1"
                  onClick={() => setRatingDraft((prev) => ({ ...prev, [task.id]: n }))}
                  aria-label={`${n}`}
                >
                  <Star
                    className={cn("h-5 w-5", active ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
                  />
                </button>
              );
            })}
          </div>
          <Textarea
            value={commentDraft[task.id] ?? ""}
            onChange={(e) => setCommentDraft((prev) => ({ ...prev, [task.id]: e.target.value }))}
            placeholder={copy.commentPlaceholder}
          />
          <Button size="sm" disabled={busyId === task.id} onClick={() => void submit(task)}>
            {copy.submit}
          </Button>
        </article>
      ))}
    </div>
  );
}
