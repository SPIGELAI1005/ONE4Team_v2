import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import {
  aggregateJoinFunnelEvents,
  EMPTY_JOIN_FUNNEL_COUNTS,
  type JoinFunnelCounts,
} from "@/lib/join-funnel";

export function JoinFunnelAnalyticsCard({ days = 30 }: { days?: number }) {
  const { t } = useLanguage();
  const copy = t.clubPageAdmin.joinFunnel;
  const { clubId } = useClubId();
  const [counts, setCounts] = useState<JoinFunnelCounts>(EMPTY_JOIN_FUNNEL_COUNTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    void supabaseDynamic
      .from("club_join_funnel_events")
      .select("event_name")
      .eq("club_id", clubId)
      .gte("created_at", since)
      .limit(2000)
      .then(({ data }) => {
        if (cancelled) return;
        setCounts(aggregateJoinFunnelEvents(((data as unknown) as { event_name: string }[] | null) ?? []));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, days]);

  const cells = [
    { label: copy.pageViews, value: counts.pageViews },
    { label: copy.joinViews, value: counts.joinViews },
    { label: copy.submitted, value: counts.submitted },
    { label: copy.approved, value: counts.approved },
    { label: copy.rejected, value: counts.rejected },
    { label: copy.conversion, value: `${counts.conversionRate}%` },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <div>
          <div className="text-sm font-semibold">{copy.title}</div>
          <div className="text-[11px] text-muted-foreground">{copy.subtitle.replace("{days}", String(days))}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl bg-muted/30 p-2.5">
            <div className="text-lg font-display font-bold">{loading ? "…" : cell.value}</div>
            <div className="text-[11px] text-muted-foreground">{cell.label}</div>
          </div>
        ))}
      </div>
      <Link to="/members" className="text-xs text-primary hover:underline">
        {copy.openMembers}
      </Link>
    </div>
  );
}
