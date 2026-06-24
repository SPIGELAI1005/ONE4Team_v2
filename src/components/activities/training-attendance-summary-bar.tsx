import { Users } from "lucide-react";
import { comingCount, type TrainingAttendanceSummary } from "@/lib/training-attendance";
import { cn } from "@/lib/utils";

interface TrainingAttendanceSummaryBarProps {
  summary: TrainingAttendanceSummary;
  className?: string;
  headline: string;
  statComing: string;
  statDeclined: string;
  statPending: string;
}

export function TrainingAttendanceSummaryBar({
  summary,
  className,
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
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90">
          <Users className="h-3.5 w-3.5 text-primary" />
          {headline}
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="text-emerald-600 dark:text-emerald-400">
          {coming} {statComing}
        </span>
        <span className="text-rose-600 dark:text-rose-400">
          {summary.declined} {statDeclined}
        </span>
        <span>
          {summary.invited} {statPending}
        </span>
      </div>
    </div>
  );
}
