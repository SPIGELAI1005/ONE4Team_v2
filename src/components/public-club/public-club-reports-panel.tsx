import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BarChart3,
  Loader2,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { PublicClubReportsIntro, publicClubDetailStackClass } from "@/components/public-club/public-club-dashboard-link";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { useLanguage } from "@/hooks/use-language";
import { usePublicClubReportPersona } from "@/hooks/use-public-club-report-persona";
import { fetchClubReportSnapshot } from "@/lib/club-reports-snapshot";
import { canAccessFinancialReports, type ClubReportPersona } from "@/lib/club-report-persona";
import {
  fetchMemberProgressSnapshot,
  type MemberProgressSnapshot,
} from "@/lib/club-member-progress";
import { getAchievementBadgeIcon } from "@/lib/achievement-badge-icons";
import { supabaseDynamic } from "@/lib/supabase-dynamic";

interface PlayerStatRow {
  membership_id: string;
  display_name: string;
  goals: number;
  assists: number;
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--club-border)]/50 bg-white/5 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[color:var(--club-foreground)]">{value}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof BarChart3; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[color:var(--club-border)]/40 pb-3">
      <Icon className="h-5 w-5 text-[color:var(--club-primary)]" aria-hidden />
      <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{title}</h3>
    </div>
  );
}

interface PublicClubReportsPanelProps {
  clubId: string;
  membershipId: string;
  membershipRole: string | null;
  basePath: string;
  searchSuffix: string;
}

export function PublicClubReportsPanel({
  clubId,
  membershipId,
  membershipRole,
  basePath,
  searchSuffix,
}: PublicClubReportsPanelProps) {
  const { t } = useLanguage();
  const { persona, loading: personaLoading } = usePublicClubReportPersona(clubId, membershipId, membershipRole);

  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState(false);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof fetchClubReportSnapshot>>["snapshot"] | null>(null);
  const [topScorers, setTopScorers] = useState<PlayerStatRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [progress, setProgress] = useState<MemberProgressSnapshot | null>(null);

  const teamFilter = useMemo(() => {
    if (persona === "trainer" && snapshot?.coachTeamIds.length === 1) return snapshot.coachTeamIds[0];
    return null;
  }, [persona, snapshot?.coachTeamIds]);

  useEffect(() => {
    let cancelled = false;
    setSnapshotLoading(true);
    setSnapshotError(false);
    void fetchClubReportSnapshot({ clubId, membershipId, persona }).then(({ snapshot: next, hadError }) => {
      if (cancelled) return;
      setSnapshot(next);
      setSnapshotError(hadError);
      setSnapshotLoading(false);
    });
    void fetchMemberProgressSnapshot(clubId, membershipId).then(({ data }) => {
      if (!cancelled) setProgress(data);
    });
    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, persona]);

  const teamIdsForStats = useMemo(() => {
    if (persona === "trainer" && snapshot?.coachTeamIds.length) return snapshot.coachTeamIds;
    if (persona === "trainer") return [];
    return teamFilter ? [teamFilter] : [];
  }, [persona, snapshot?.coachTeamIds, teamFilter]);

  useEffect(() => {
    if (persona === "sponsor" || persona === "member") {
      setTopScorers([]);
      return;
    }
    if (persona === "trainer" && teamIdsForStats.length === 0) {
      setTopScorers([]);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);

    async function loadStats() {
      const aggregate = new Map<string, PlayerStatRow>();
      const teamIds = persona === "trainer" ? teamIdsForStats : [null];
      for (const tid of teamIds) {
        const { data, error } = await supabaseDynamic.rpc("get_player_stats_aggregate", {
          _club_id: clubId,
          _team_id: tid,
          _competition_id: null,
          _competition_ids: null,
        });
        if (error || cancelled) continue;
        for (const row of (data as PlayerStatRow[]) ?? []) {
          const goals = Number(row.goals || 0);
          if (goals <= 0) continue;
          const existing = aggregate.get(row.membership_id);
          if (existing) {
            existing.goals += goals;
            existing.assists += Number(row.assists || 0);
          } else {
            aggregate.set(row.membership_id, {
              membership_id: row.membership_id,
              display_name: row.display_name || t.common.unknown,
              goals,
              assists: Number(row.assists || 0),
            });
          }
        }
      }

      if (cancelled) return;
      const rows = [...aggregate.values()].sort((a, b) => b.goals - a.goals);
      const scoped = persona === "player" ? rows.filter((row) => row.membership_id === membershipId) : rows;
      setTopScorers(scoped.slice(0, 8));
      setStatsLoading(false);
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, persona, teamIdsForStats, t.common.unknown]);

  const scopeCopy = useMemo(() => {
    if (persona === "admin") return t.clubPage.reportsScopeAdminPublic;
    if (persona === "trainer") return t.reportsPage.scopeTrainer;
    if (persona === "player") return t.reportsPage.scopePlayer;
    if (persona === "sponsor") return t.reportsPage.scopeSponsor;
    return t.reportsPage.scopeMember;
  }, [persona, t.clubPage.reportsScopeAdminPublic, t.reportsPage]);

  const personaLabel = useMemo(() => {
    const labels: Record<ClubReportPersona, string> = {
      admin: t.clubPage.reportsPersonaAdmin,
      trainer: t.clubPage.reportsPersonaTrainer,
      player: t.clubPage.reportsPersonaPlayer,
      sponsor: t.clubPage.reportsPersonaSponsor,
      member: t.clubPage.reportsPersonaMember,
    };
    return labels[persona];
  }, [persona, t.clubPage]);

  const matchesHref = `${basePath}/matches${searchSuffix}`;
  const showScorers = persona !== "sponsor" && persona !== "member";
  const financialNote =
    persona === "admin" && !canAccessFinancialReports(persona, "public") ? t.clubPage.reportsFinancialDashboardOnly : undefined;

  if (personaLoading || snapshotLoading) {
    return (
      <div className={`${publicClubDetailStackClass} flex justify-center py-16`}>
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
      </div>
    );
  }

  return (
    <div className={publicClubDetailStackClass}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--club-border)]/60 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--club-foreground)]">
          <Shield className="h-3.5 w-3.5 text-[color:var(--club-primary)]" />
          {personaLabel}
        </span>
      </div>

      <PublicClubReportsIntro scope={scopeCopy} financialNote={financialNote} />

      {snapshotError ? (
        <p className="text-sm text-amber-500">{t.reportsPage.snapshotLoadError}</p>
      ) : null}

      {persona === "admin" ? (
        <PublicClubCard className="space-y-4">
          <SectionHeader icon={BarChart3} title={t.reportsPage.sectionOverview} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label={t.reportsPage.kpiActiveMembers} value={snapshot?.membersActive ?? "-"} />
            <KpiTile label={t.reportsPage.kpiTeams} value={snapshot?.teamsCount ?? "-"} />
            <KpiTile label={t.reportsPage.kpiUpcomingMatches} value={snapshot?.upcomingMatches ?? "-"} />
            <KpiTile label={t.reportsPage.kpiTrainings14d} value={snapshot?.trainingsNext14d ?? "-"} />
          </div>
        </PublicClubCard>
      ) : null}

      {persona === "trainer" ? (
        <PublicClubCard className="space-y-4">
          <SectionHeader icon={Users} title={t.reportsPage.sectionCoaching} />
          {snapshot && snapshot.coachTeamIds.length === 0 ? (
            <p className="text-sm text-[color:var(--club-muted)]">{t.reportsPage.kpiNoTeams}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <KpiTile label={t.reportsPage.kpiCoachedTeams} value={snapshot?.coachTeamIds.length ?? 0} />
              <KpiTile label={t.reportsPage.kpiTeamTrainings14d} value={snapshot?.coachTrainings14d ?? "-"} />
            </div>
          )}
        </PublicClubCard>
      ) : null}

      {persona === "player" ? (
        <PublicClubCard className="space-y-4">
          <SectionHeader icon={Users} title={t.reportsPage.sectionPlayer} />
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiTile label={t.reportsPage.kpiYourTeams} value={snapshot?.playerTeamIds.length ?? 0} />
            <KpiTile label={t.reportsPage.kpiYourUpcomingSessions} value={snapshot?.playerSessions14d ?? "-"} />
            {progress ? (
              <>
                <KpiTile label={t.clubProgress.kpiStreak} value={progress.attendance_streak} />
                <KpiTile label={t.clubProgress.kpiBadges} value={progress.badge_count} />
              </>
            ) : null}
          </div>
          {progress && progress.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {progress.badges.slice(0, 8).map((badge) => {
                const Icon = getAchievementBadgeIcon(badge.badge_type);
                const label = t.clubProgress.badgeNames[badge.badge_type] ?? badge.badge_name;
                return (
                  <div
                    key={`${badge.badge_type}-${badge.earned_at ?? badge.id ?? label}`}
                    className="flex min-w-[68px] flex-col items-center gap-1 rounded-xl border border-[color:var(--club-border)]/40 bg-white/5 px-2 py-2"
                  >
                    <Icon className="h-4 w-4 text-[color:var(--club-primary)]" />
                    <span className="text-center text-[10px] text-[color:var(--club-foreground)]">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </PublicClubCard>
      ) : null}

      {persona === "sponsor" ? (
        <PublicClubCard>
          <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.reportsPage.partnerIntro}</p>
        </PublicClubCard>
      ) : null}

      {showScorers ? (
        <PublicClubCard className="space-y-4">
          <SectionHeader icon={Trophy} title={t.reportsPage.tabScorers} />
          {statsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-[color:var(--club-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.reportsPage.loadingMetrics}
            </div>
          ) : topScorers.length === 0 ? (
            <p className="py-4 text-sm text-[color:var(--club-muted)]">
              {persona === "player" ? t.reportsPage.emptyPlayerStats : t.reportsPage.emptyScorers}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[color:var(--club-border)]/40">
              <div className="grid grid-cols-[2.5rem_1fr_5rem] gap-2 border-b border-[color:var(--club-border)]/40 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">
                <span>#</span>
                <span>{t.clubPage.reportsScorerColumnPlayer}</span>
                <span className="text-right">{t.reportsPage.tabScorers}</span>
              </div>
              <ul>
                {topScorers.map((row, index) => (
                  <li
                    key={row.membership_id}
                    className="grid grid-cols-[2.5rem_1fr_5rem] gap-2 border-b border-[color:var(--club-border)]/30 px-3 py-2.5 text-sm last:border-b-0"
                  >
                    <span className="font-medium tabular-nums text-[color:var(--club-muted)]">{index + 1}</span>
                    <span className="min-w-0 truncate font-medium text-[color:var(--club-foreground)]">{row.display_name}</span>
                    <span className="text-right font-display font-bold tabular-nums text-[color:var(--club-primary)]">{row.goals}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Link
              to={matchesHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
            >
              {t.reportsPage.linkMatches}
              <Award className="h-4 w-4" />
            </Link>
          </div>
        </PublicClubCard>
      ) : null}
    </div>
  );
}
