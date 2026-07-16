import { useLanguage } from "@/hooks/use-language";
import { formatAiCapLabel, type AiUsageMeterState } from "@/lib/ai-usage-meter";
import { cn } from "@/lib/utils";

interface AiUsageMeterProps {
  meter: AiUsageMeterState;
  className?: string;
}

export function AiUsageMeter({ meter, className }: AiUsageMeterProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("space-y-3", className)}>
      {(meter.isNearCap || meter.isAtCap) && (
        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-xs",
            meter.isAtCap
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
          )}
        >
          {meter.isAtCap ? t.settingsPage.aiUsageAtCap : t.settingsPage.aiUsageNearCap}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <UsageBar
          label={t.settingsPage.aiUsageAgentRuns}
          used={meter.usage.agentRuns}
          cap={meter.caps.agentRuns}
          pct={meter.agentRunsPct}
        />
        <UsageBar
          label={t.settingsPage.aiUsageConversations}
          used={meter.usage.conversations}
          cap={meter.caps.conversations}
          pct={meter.conversationsPct}
        />
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  cap,
  pct,
}: {
  label: string;
  used: number;
  cap: number;
  pct: number;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-3">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{formatAiCapLabel(used, cap)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-destructive" : pct >= 85 ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
