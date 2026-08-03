import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Ai4TInlineLabel } from "@/components/ai/Ai4TBrand";
import { AiUsageMeter } from "@/components/dashboard/AiUsageMeter";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { buildAiUsageMeterState } from "@/lib/ai-usage-meter";
import {
  DASHBOARD_STAT_MINI_GRID,
  DASHBOARD_STAT_MINI_LABEL,
  DASHBOARD_STAT_MINI_VALUE,
} from "@/lib/dashboard-page-shell";

interface AiUsageStats {
  agent_runs_total?: number;
  agent_runs_executed?: number;
  agent_runs_failed?: number;
  conversations_updated?: number;
  internet_research_sessions?: number;
}

export function Ai4tAdminUsageCard() {
  const { t } = useLanguage();
  const { activeClubId } = useActiveClub();
  const { planId } = useSubscription();
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(false);

  const monthRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
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
        _from: monthRange.from,
        _to: monthRange.to,
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
  }, [activeClubId, monthRange.from, monthRange.to]);

  const meter = useMemo(() => {
    if (!stats) return null;
    return buildAiUsageMeterState(planId, {
      agentRuns: stats.agent_runs_total ?? 0,
      conversations: stats.conversations_updated ?? 0,
      internetResearch: stats.internet_research_sessions ?? 0,
    });
  }, [planId, stats]);

  if (!activeClubId) return null;

  const total = stats?.agent_runs_total ?? 0;
  const executed = stats?.agent_runs_executed ?? 0;
  const successRate = total > 0 ? Math.round((executed / total) * 100) : null;

  return (
    <div className="min-w-0 rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold">
            <Ai4TInlineLabel text={t.dashboard.ai4tUsageTitle} logoClassName="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">{t.dashboard.ai4tUsageSubtitleMonthly}</p>
        </div>
        <Link
          to="/co-trainer?tab=history"
          className="text-sm text-primary hover:underline shrink-0 self-start sm:self-auto"
        >
          {t.dashboard.ai4tUsageViewHistory}
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {meter ? <AiUsageMeter meter={meter} className="mt-4" /> : null}
          <div className={`mt-4 ${DASHBOARD_STAT_MINI_GRID}`}>
            <div className="min-w-0 rounded-2xl border border-border/60 bg-background/40 p-3">
              <div className={DASHBOARD_STAT_MINI_LABEL}>{t.dashboard.ai4tUsageAgentRuns}</div>
              <div className={DASHBOARD_STAT_MINI_VALUE}>{total}</div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border/60 bg-background/40 p-3">
              <div className={DASHBOARD_STAT_MINI_LABEL}>{t.dashboard.ai4tUsageExecuted}</div>
              <div className={DASHBOARD_STAT_MINI_VALUE}>{executed}</div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border/60 bg-background/40 p-3">
              <div className={DASHBOARD_STAT_MINI_LABEL}>{t.dashboard.ai4tUsageSuccessRate}</div>
              <div className={DASHBOARD_STAT_MINI_VALUE}>{successRate != null ? `${successRate}%` : "-"}</div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border/60 bg-background/40 p-3">
              <div className={DASHBOARD_STAT_MINI_LABEL}>{t.dashboard.ai4tUsageChats}</div>
              <div className={DASHBOARD_STAT_MINI_VALUE}>{stats?.conversations_updated ?? 0}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
