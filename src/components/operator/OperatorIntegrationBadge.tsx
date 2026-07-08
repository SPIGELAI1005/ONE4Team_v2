import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface OperatorIntegrationBadgeProps {
  connected: boolean;
  className?: string;
}

export function OperatorIntegrationBadge({ connected, className }: OperatorIntegrationBadgeProps) {
  const { t } = useLanguage();

  if (connected) {
    return (
      <Badge variant="secondary" className={cn("font-normal", className)}>
        {t.operator.shell.integrationConnected}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("font-normal text-muted-foreground", className)}>
      {t.operator.shell.integrationNotConnected}
    </Badge>
  );
}

interface OperatorMetricPlaceholderProps {
  label: string;
  connected: boolean;
  value: string;
  hint?: string;
  isLoading?: boolean;
}

export function OperatorMetricPlaceholder({
  label,
  connected,
  value,
  hint,
  isLoading = false,
}: OperatorMetricPlaceholderProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="hyphens-auto break-words text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="mt-2 font-display text-2xl font-bold text-foreground">{value}</div>
          )}
          {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
        </div>
        <OperatorIntegrationBadge connected={connected} className="shrink-0" />
      </div>
    </div>
  );
}
