import { BotMessageSquare, Cable, CheckCircle2, CircleAlert, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExternalBridgeProvider = "whatsapp" | "telegram";

export type ExternalBridgeConnectorStatus = "pending" | "connected" | "error" | "disabled";

export interface ExternalBridgeHealthRow {
  id: string;
  provider: ExternalBridgeProvider;
  status: ExternalBridgeConnectorStatus;
  displayName: string;
  processed: number;
  failed: number;
}

export interface ExternalBridgePanelLabels {
  title: string;
  beta: string;
  lead: string;
  whatsApp: string;
  telegram: string;
  configureAction: string;
  emptyTitle: string;
  emptyBody: string;
  statusSection: string;
  processedCount: string;
  failedCount: string;
  pending: string;
  connected: string;
  disabled: string;
  error: string;
}

interface ExternalBridgePanelProps {
  labels: ExternalBridgePanelLabels;
  health: ExternalBridgeHealthRow[];
  onOpenProvider: (provider: ExternalBridgeProvider) => void;
  className?: string;
  /** Compact layout for mobile strip under the channel picker. */
  compact?: boolean;
}

const statusTone: Record<ExternalBridgeConnectorStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/25",
  connected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30",
  error: "bg-destructive/15 text-destructive ring-1 ring-destructive/25",
  disabled: "bg-muted text-muted-foreground ring-1 ring-border/60",
};

function statusLabel(status: ExternalBridgeConnectorStatus, labels: ExternalBridgePanelLabels): string {
  if (status === "pending") return labels.pending;
  if (status === "connected") return labels.connected;
  if (status === "error") return labels.error;
  return labels.disabled;
}

export function ExternalBridgePanel({
  labels,
  health,
  onOpenProvider,
  className,
  compact = false,
}: ExternalBridgePanelProps) {
  const connectedCount = health.filter((row) => row.status === "connected").length;
  const hasError = health.some((row) => row.status === "error" || row.failed > 0);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.08] to-card/90 shadow-sm",
        compact ? "p-3" : "p-3.5",
        className,
      )}
      aria-label={labels.title}
    >
      <header className={cn("flex items-start gap-3", compact ? "mb-2.5" : "mb-3")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold-static text-primary-foreground shadow-sm">
          <BotMessageSquare className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-semibold leading-tight text-foreground">{labels.title}</h3>
            <span className="inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/25">
              {labels.beta}
            </span>
          </div>
          <p className={cn("mt-1 text-muted-foreground", compact ? "text-[11px] leading-snug" : "text-xs leading-snug")}>
            {labels.lead}
          </p>
        </div>
      </header>

      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-1")}>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-auto justify-start gap-2.5 border-border/80 bg-background/80 px-3 py-2.5 text-left hover:border-[#25D366]/50 hover:bg-[#25D366]/10",
            !compact && "w-full",
          )}
          onClick={() => onOpenProvider("whatsapp")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{labels.whatsApp}</span>
            {!compact ? (
              <span className="block text-[10px] text-muted-foreground">{labels.configureAction}</span>
            ) : null}
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-auto justify-start gap-2.5 border-border/80 bg-background/80 px-3 py-2.5 text-left hover:border-[#229ED9]/50 hover:bg-[#229ED9]/10",
            !compact && "w-full",
          )}
          onClick={() => onOpenProvider("telegram")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#229ED9]/15 text-[#229ED9]">
            <Send className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{labels.telegram}</span>
            {!compact ? (
              <span className="block text-[10px] text-muted-foreground">{labels.configureAction}</span>
            ) : null}
          </span>
        </Button>
      </div>

      <div className={cn("mt-3 rounded-xl border border-border/70 bg-background/70", compact ? "p-2.5" : "p-3")}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Cable className="h-3.5 w-3.5 text-primary" aria-hidden />
            {labels.statusSection}
          </div>
          {health.length > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                hasError
                  ? "bg-destructive/10 text-destructive"
                  : connectedCount > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {hasError ? (
                <CircleAlert className="h-3 w-3" aria-hidden />
              ) : (
                <CheckCircle2 className="h-3 w-3" aria-hidden />
              )}
              {connectedCount}/{health.length}
            </span>
          ) : null}
        </div>

        {compact ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {health.length === 0
              ? labels.emptyBody
              : hasError
                ? labels.failedCount.replace(
                    "{count}",
                    String(health.reduce((sum, row) => sum + row.failed, 0)),
                  )
                : labels.processedCount.replace(
                    "{count}",
                    String(health.reduce((sum, row) => sum + row.processed, 0)),
                  )}
          </p>
        ) : health.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-3 text-center">
            <p className="text-xs font-medium text-foreground">{labels.emptyTitle}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{labels.emptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {health.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/70 bg-card/80 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {row.displayName || (row.provider === "whatsapp" ? labels.whatsApp : labels.telegram)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {row.provider === "whatsapp" ? labels.whatsApp : labels.telegram}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", statusTone[row.status])}>
                    {statusLabel(row.status, labels)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span>{labels.processedCount.replace("{count}", String(row.processed))}</span>
                  <span className={row.failed > 0 ? "font-medium text-destructive" : undefined}>
                    {labels.failedCount.replace("{count}", String(row.failed))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
