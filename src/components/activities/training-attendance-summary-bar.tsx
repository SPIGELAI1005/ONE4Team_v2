import { Users } from "lucide-react";
import { comingCount, type TrainingAttendanceSummary } from "@/lib/training-attendance";
import { cn } from "@/lib/utils";

interface TrainingAttendanceSummaryBarProps {
  summary: TrainingAttendanceSummary;
  className?: string;
  variant?: "dashboard" | "club";
  headline: string;
  statComing: string;
  statDeclined: string;
  statPending: string;
}

export function TrainingAttendanceSummaryBar({
  summary,
  className,
  variant = "dashboard",
  headline,
  statComing,
  statDeclined,
  statPending,
}: TrainingAttendanceSummaryBarProps) {
  const coming = comingCount(summary);
  const pct = summary.total > 0 ? Math.round((coming / summary.total) * 100) : 0;

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            variant === "club" ? "text-white/90" : "text-foreground/90",
          )}
        >
          <Users className={cn("h-3.5 w-3.5", variant === "club" ? "text-white/80" : "text-primary")} />
          {headline}
        </span>
        <span className={variant === "club" ? "text-white/70" : "text-muted-foreground"}>{pct}%</span>
      </div>
      <div
        className={cn(
          "h-1.5 overflow-hidden rounded-full",
          variant === "club" ? "bg-white/15" : "bg-muted/50",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            variant === "club"
              ? "bg-gradient-to-r from-white/90 to-white/70"
              : "bg-gradient-to-r from-primary/80 to-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-x-3 gap-y-1 text-[10px]",
          variant === "club" ? "text-white/75" : "text-muted-foreground",
        )}
      >
        <span className={variant === "club" ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400"}>
          {coming} {statComing}
        </span>
        <span className={variant === "club" ? "text-rose-100" : "text-rose-600 dark:text-rose-400"}>
          {summary.declined} {statDeclined}
        </span>
        <span>
          {summary.invited} {statPending}
        </span>
      </div>
    </div>
  );
}
