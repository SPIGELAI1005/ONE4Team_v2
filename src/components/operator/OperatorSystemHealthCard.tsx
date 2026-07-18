import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import {
  collectOperatorSystemHealth,
  type HealthProbeResult,
  type OperatorSystemHealthReport,
} from "@/lib/operator-system-health";

function statusVariant(status: HealthProbeResult["status"]) {
  if (status === "ok") return "default" as const;
  if (status === "fail") return "destructive" as const;
  if (status === "skipped") return "outline" as const;
  return "secondary" as const;
}

export function OperatorSystemHealthCard() {
  const [report, setReport] = useState<OperatorSystemHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await collectOperatorSystemHealth());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          System health
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {report ? (
          <p className="text-[11px] text-muted-foreground">
            Probed {new Date(report.generatedAt).toLocaleString()}
          </p>
        ) : null}
        <div className="space-y-2">
          {(report?.probes || []).map((probe) => (
            <div
              key={probe.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm text-foreground">{probe.label}</div>
                <div className="text-[11px] text-muted-foreground break-all">{probe.detail}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {probe.latencyMs != null ? (
                  <span className="text-[10px] text-muted-foreground tabular-nums">{probe.latencyMs}ms</span>
                ) : null}
                <Badge variant={statusVariant(probe.status)}>{probe.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
