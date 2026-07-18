import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Ai4TInlineLabel } from "@/components/ai/Ai4TBrand";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { fetchClubAiValueMetrics, type AiValueMetrics } from "@/lib/ai-value-metrics";

export function Ai4tValueMetricsCard() {
  const { t } = useLanguage();
  const { activeClubId } = useActiveClub();
  const [metrics, setMetrics] = useState<AiValueMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  useEffect(() => {
    if (!activeClubId) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchClubAiValueMetrics(activeClubId, monthRange.from, monthRange.to)
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t.common.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeClubId, monthRange.from, monthRange.to, t.common.error]);

  if (!activeClubId) return null;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-2xl p-4">
      <div className="font-display font-bold">
        <Ai4TInlineLabel text={t.dashboard.ai4tValueTitle} logoClassName="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{t.dashboard.ai4tValueSubtitle}</p>

      {loading ? (
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.common.loading}
        </div>
      ) : error ? (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      ) : metrics ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: t.dashboard.ai4tValueProposed, value: metrics.proposed },
              { label: t.dashboard.ai4tValueExecuted, value: metrics.executed },
              { label: t.dashboard.ai4tValueFailed, value: metrics.failed },
              { label: t.dashboard.ai4tValueDeclined, value: metrics.declined },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-medium text-foreground mb-1">{t.dashboard.ai4tValueWorkflows}</div>
            {metrics.topIntents.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">{t.dashboard.ai4tValueNoRuns}</p>
            ) : (
              <ul className="space-y-1">
                {metrics.topIntents.map((row) => (
                  <li key={row.intent} className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-foreground">{row.intent}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{t.dashboard.ai4tValueTokensNote}</p>
        </div>
      ) : null}
    </div>
  );
}
