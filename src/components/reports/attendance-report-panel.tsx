import { useCallback, useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadAttendanceReportWindow } from "@/lib/attendance-report-api";
import { formatPercent, type AttendanceWindowAggregate } from "@/lib/attendance-report-metrics";

interface AttendanceReportPanelProps {
  clubId: string;
  teams: { id: string; name: string }[];
  labels: {
    title: string;
    subtitle: string;
    allTeams: string;
    activities: string;
    avgResponse: string;
    avgComing: string;
    missing: string;
    gaps: string;
    loading: string;
    empty: string;
    failed: string;
    definitionsHint: string;
  };
}

export function AttendanceReportPanel({ clubId, teams, labels }: AttendanceReportPanelProps) {
  const [teamId, setTeamId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregate, setAggregate] = useState<AttendanceWindowAggregate | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const from = new Date(now.getTime() - 28 * 86400000);
    const { data, error: loadError } = await loadAttendanceReportWindow({
      clubId,
      fromIso: from.toISOString(),
      toIso: now.toISOString(),
      teamId: teamId === "all" ? null : teamId,
    });
    if (loadError) {
      setError(loadError.message);
      setAggregate(null);
    } else {
      setAggregate(data);
    }
    setLoading(false);
  }, [clubId, teamId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              {labels.title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">{labels.subtitle}</CardDescription>
          </div>
          {teams.length > 0 ? (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.allTeams}</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {labels.loading}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{labels.failed}</p>
        ) : !aggregate || aggregate.activitiesInWindow === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label={labels.activities} value={String(aggregate.activitiesInWindow)} />
            <Metric label={labels.avgResponse} value={formatPercent(aggregate.avgResponseRate)} />
            <Metric label={labels.avgComing} value={formatPercent(aggregate.avgComingRate)} />
            <Metric label={labels.missing} value={String(aggregate.totalMissing)} />
            <Metric label={labels.gaps} value={String(aggregate.rsvpGapActivities)} />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">{labels.definitionsHint}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
