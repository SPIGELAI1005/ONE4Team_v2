import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2 } from "lucide-react";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import { supabase } from "@/integrations/supabase/client";

interface AiUsageStats {
  agent_runs_total?: number;
  agent_runs_executed?: number;
  agent_runs_failed?: number;
  conversations_updated?: number;
}

export function Ai4tAdminUsageCard() {
  const { t } = useLanguage();
  const { activeClubId } = useActiveClub();
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(false);

  const weekRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  useEffect(() => {
    if (!activeClubId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void supabase
      .rpc("get_club_ai_usage_stats", {
        _club_id: activeClubId,
        _from: weekRange.from,
        _to: weekRange.to,
      })
      .then(({ data, error }) => {
        if (!cancelled) {
          if (!error && data) setStats(data as AiUsageStats);
          else setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeClubId, weekRange.from, weekRange.to]);

  if (!activeClubId) return null;

  const total = stats?.agent_runs_total ?? 0;
  const executed = stats?.agent_runs_executed ?? 0;
  const successRate = total > 0 ? Math.round((executed / total) * 100) : null;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <BrandedText text={t.dashboard.ai4tUsageTitle} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t.dashboard.ai4tUsageSubtitle}</p>
        </div>
        <Link to="/co-trainer?tab=history" className="text-xs text-primary hover:underline shrink-0">
          {t.dashboard.ai4tUsageViewHistory}
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.ai4tUsageAgentRuns}</div>
            <div className="text-xl font-semibold mt-1">{total}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.ai4tUsageExecuted}</div>
            <div className="text-xl font-semibold mt-1">{executed}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.ai4tUsageSuccessRate}</div>
            <div className="text-xl font-semibold mt-1">{successRate != null ? `${successRate}%` : "-"}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.ai4tUsageChats}</div>
            <div className="text-xl font-semibold mt-1">{stats?.conversations_updated ?? 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}
