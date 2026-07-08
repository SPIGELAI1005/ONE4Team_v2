import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { formatOverviewNumber } from "@/lib/platform-overview";

interface OperatorMetricCardProps {
  label: string;
  value: number | string | null | undefined;
  hint?: string;
  info?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  isLoading?: boolean;
  href?: string;
}
const toneClasses = {
  default: "border-border/70 bg-card/70",
  success: "border-emerald-500/20 bg-emerald-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
  danger: "border-rose-500/20 bg-rose-500/5",
} as const;

export function OperatorMetricCard({
  label,
  value,
  hint,
  info,
  icon: Icon,
  tone = "default",
  isLoading = false,
  href,
}: OperatorMetricCardProps) {  const { t } = useLanguage();
  const displayValue = typeof value === "number" ? formatOverviewNumber(value) : value ?? "—";

  const content = (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm backdrop-blur-xl transition-colors",
        toneClasses[tone],
        href ? "hover:border-primary/30 hover:bg-card/90" : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="hyphens-auto break-words text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="mt-2 font-display text-2xl font-bold text-foreground">{displayValue}</div>
          )}
          {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
          {href ? <p className="mt-2 text-xs font-medium text-primary">{t.operator.shell.viewDetails}</p> : null}
        </div>
        {Icon ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            {info ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t.operator.shell.infoLabel}
                    onClick={(event) => event.preventDefault()}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="max-w-xs text-xs leading-5">
                  {info}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : null}      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    );
  }

  return content;
}
