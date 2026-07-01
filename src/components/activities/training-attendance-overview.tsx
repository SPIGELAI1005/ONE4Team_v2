import { Check, Users, X } from "lucide-react";
import { TrainingAttendanceSummaryBar } from "@/components/activities/training-attendance-summary-bar";
import {
  comingCount,
  type ActivityAttendanceOverview,
  type RosterAttendanceLine,
} from "@/lib/training-attendance";
import { cn } from "@/lib/utils";

interface TrainingAttendanceOverviewProps {
  overview: ActivityAttendanceOverview;
  variant?: "dashboard" | "club";
  className?: string;
  labels: {
    sectionTitle: string;
    summaryHeadline: string;
    statComing: string;
    statDeclined: string;
    statPending: string;
    comingList: string;
    declinedList: string;
    noResponsesYet: string;
  };
}

function NameList({
  title,
  lines,
  tone,
  variant,
}: {
  title: string;
  lines: RosterAttendanceLine[];
  tone: "coming" | "declined";
  variant: "dashboard" | "club";
}) {
  if (lines.length === 0) return null;

  const Icon = tone === "coming" ? Check : X;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide",
          tone === "coming"
            ? variant === "club"
              ? "text-emerald-100"
              : "text-emerald-600 dark:text-emerald-400"
            : variant === "club"
              ? "text-rose-100"
              : "text-rose-600 dark:text-rose-400",
        )}
      >
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <ul className="space-y-0.5">
        {lines.map((line) => (
          <li
            key={line.membershipId}
            className={cn(
              "text-xs",
              variant === "club" ? "text-white/90" : "text-foreground/90",
            )}
          >
            <span className="font-medium">{line.name}</span>
            {line.declineReason ? (
              <span className={cn(variant === "club" ? "text-white/70" : "text-muted-foreground")}>
                {" "}
                - {line.declineReason}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrainingAttendanceOverview({
  overview,
  variant = "dashboard",
  className,
  labels,
}: TrainingAttendanceOverviewProps) {
  const { summary, lines } = overview;
  const coming = lines.filter((l) => l.status === "confirmed" || l.status === "attended");
  const declined = lines.filter((l) => l.status === "declined");

  if (summary.total === 0) {
    return (
      <p
        className={cn(
          "text-[11px]",
          variant === "club" ? "text-[color:var(--club-muted)]" : "text-muted-foreground",
          className,
        )}
      >
        {labels.noResponsesYet}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border p-3",
        variant === "club"
          ? "border-[color:var(--club-border)] bg-white/[0.07]"
          : "border-border/60 bg-background/35",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Users
          className={cn(
            "h-3.5 w-3.5",
            variant === "club" ? "text-[color:var(--club-muted)]" : "text-primary",
          )}
        />
        <span className={variant === "club" ? "text-[color:var(--club-muted)]" : "text-muted-foreground"}>
          {labels.sectionTitle}
        </span>
      </div>

      <TrainingAttendanceSummaryBar
        summary={summary}
        variant={variant}
        headline={labels.summaryHeadline
          .replace("{count}", String(comingCount(summary)))
          .replace("{total}", String(summary.total))}
        statComing={labels.statComing}
        statDeclined={labels.statDeclined}
        statPending={labels.statPending}
        className="mt-0"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <NameList title={labels.comingList} lines={coming} tone="coming" variant={variant} />
        <NameList title={labels.declinedList} lines={declined} tone="declined" variant={variant} />
      </div>
    </div>
  );
}
