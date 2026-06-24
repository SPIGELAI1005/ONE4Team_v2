import { Copy, MessageSquareText, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TrainingAttendanceSummaryBar } from "@/components/activities/training-attendance-summary-bar";
import {
  buildRosterAttendanceLines,
  comingCount,
  memberInitials,
  summarizeTrainingAttendance,
  type RosterAttendanceLine,
  type TrainingAttendanceRow,
} from "@/lib/training-attendance";
import { cn } from "@/lib/utils";

interface TrainingAttendanceTrainerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityTitle: string;
  activityStartsAt: string;
  activityType: string;
  teamName: string | null;
  roster: { membershipId: string; name: string; role: string; jerseyNumber?: number | null }[];
  attendance: TrainingAttendanceRow[];
  onNudgeUnconfirmed: () => void;
  labels: {
    title: string;
    coming: string;
    declined: string;
    pending: string;
    summaryComing: string;
    tabComing: string;
    tabDeclined: string;
    tabPending: string;
    nudge: string;
    noPlayers: string;
    reasonPrefix: string;
    rosterScopeTeam: string;
    rosterScopeClub: string;
    nudgeFootnote: string;
    copyList: string;
  };
}

function AttendanceMemberRow({ line, reasonPrefix }: { line: RosterAttendanceLine; reasonPrefix: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          line.status === "confirmed" || line.status === "attended"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : line.status === "declined"
              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
              : "bg-muted text-muted-foreground",
        )}
      >
        {memberInitials(line.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{line.name}</span>
          {line.jerseyNumber != null ? (
            <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              #{line.jerseyNumber}
            </span>
          ) : null}
        </div>
        <div className="text-[10px] capitalize text-muted-foreground">{line.role}</div>
        {line.declineReason ? (
          <div className="mt-1.5 flex gap-1.5 text-xs text-muted-foreground">
            <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span>
              <span className="font-medium text-foreground/80">{reasonPrefix}</span> {line.declineReason}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TrainingAttendanceTrainerPanel({
  open,
  onOpenChange,
  activityTitle,
  activityStartsAt,
  activityType,
  teamName,
  roster,
  attendance,
  onNudgeUnconfirmed,
  labels,
}: TrainingAttendanceTrainerPanelProps) {
  const attendanceByMember: Record<string, TrainingAttendanceRow> = {};
  for (const row of attendance) attendanceByMember[row.membership_id] = row;

  const lines = buildRosterAttendanceLines({ roster, attendanceByMember });
  const summary = summarizeTrainingAttendance(
    lines.map((line) => ({
      id: attendanceByMember[line.membershipId]?.id ?? line.membershipId,
      activity_id: attendanceByMember[line.membershipId]?.activity_id ?? "",
      membership_id: line.membershipId,
      status: line.status,
      notes: attendanceByMember[line.membershipId]?.notes ?? null,
    })),
  );

  const coming = lines.filter((l) => l.status === "confirmed" || l.status === "attended");
  const declined = lines.filter((l) => l.status === "declined");
  const pending = lines.filter((l) => l.status === "invited");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-border/60 bg-card/95 backdrop-blur-xl sm:max-w-lg">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="font-display text-xl">{labels.title}</SheetTitle>
          <p className="text-sm font-semibold text-foreground">{activityTitle}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(activityStartsAt).toLocaleString()} · {activityType.toUpperCase()}
            {teamName ? ` · ${teamName}` : ""}
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {teamName ? labels.rosterScopeTeam.replace("{team}", teamName) : labels.rosterScopeClub}
          </p>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: labels.tabComing, count: coming.length, tone: "text-emerald-600 dark:text-emerald-400" },
            { label: labels.tabDeclined, count: declined.length, tone: "text-rose-600 dark:text-rose-400" },
            { label: labels.tabPending, count: pending.length, tone: "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/60 bg-background/40 p-3 text-center">
              <div className={cn("font-display text-2xl font-bold", stat.tone)}>{stat.count}</div>
              <div className="text-[10px] font-medium text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <TrainingAttendanceSummaryBar
          summary={summary}
          headline={labels.summaryComing
            .replace("{count}", String(comingCount(summary)))
            .replace("{total}", String(summary.total))}
          statComing={labels.coming}
          statDeclined={labels.declined}
          statPending={labels.pending}
        />

        <div className="mt-4 flex gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onNudgeUnconfirmed}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {labels.nudge}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-xl"
            onClick={() => {
              const msg = [
                `${activityTitle} — ${labels.tabComing}: ${comingCount(summary)}`,
                ...coming.map((l) => `✅ ${l.name}`),
                ...declined.map((l) => `❌ ${l.name}${l.declineReason ? ` (${l.declineReason})` : ""}`),
              ].join("\n");
              void navigator.clipboard.writeText(msg);
            }}
          >
            <Copy className="mr-1.5 h-4 w-4" />
            {labels.copyList}
          </Button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {[
            { title: labels.tabComing, rows: coming },
            { title: labels.tabDeclined, rows: declined },
            { title: labels.tabPending, rows: pending },
          ].map((section) => (
            <div key={section.title}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</div>
              {section.rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                  {labels.noPlayers}
                </div>
              ) : (
                <div className="space-y-2">
                  {section.rows.map((line) => (
                    <AttendanceMemberRow key={line.membershipId} line={line} reasonPrefix={labels.reasonPrefix} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground">{labels.nudgeFootnote}</p>
      </SheetContent>
    </Sheet>
  );
}
