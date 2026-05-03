import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Loader2, Trophy, Users } from "lucide-react";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { Input } from "@/components/ui/input";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { encodePublicTeamPathSegment } from "@/lib/public-club-team-slug";
import { matchesSectionFilter, type TrainingSessionRowLite } from "@/lib/public-club-models";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { inferPublicTeamAgeBucket, type PublicTeamAgeBucketId } from "@/lib/public-team-age-buckets";
import { cn } from "@/lib/utils";

function useTeamUpcomingSessions(sessions: TrainingSessionRowLite[]) {
  return useMemo(() => {
    const m = new Map<string, TrainingSessionRowLite>();
    const nowMs = Date.now();
    const horizonMs = nowMs - 12 * 3600000;
    const sorted = [...sessions].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    for (const s of sorted) {
      if (!s.team_id) continue;
      if (new Date(s.starts_at).getTime() < horizonMs) continue;
      if (!m.has(s.team_id)) m.set(s.team_id, s);
    }
    return m;
  }, [sessions]);
}

export default function PublicClubTeamsPage() {
  const { t } = useLanguage();
  const { teams, sessions, loadingData, basePath, searchSuffix, publicCoachCountByTeamId } = usePublicClub();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<PublicTeamAgeBucketId>("all");
  const nextTrainingByTeam = useTeamUpcomingSessions(sessions);

  const tabs: { id: PublicTeamAgeBucketId; label: string }[] = useMemo(
    () => [
      { id: "all", label: t.clubPage.teamsFilterAll },
      { id: "bambini", label: t.clubPage.teamsFilterBambini },
      { id: "u7", label: t.clubPage.teamsFilterU7 },
      { id: "u8", label: t.clubPage.teamsFilterU8 },
      { id: "u9", label: t.clubPage.teamsFilterU9 },
      { id: "u10", label: t.clubPage.teamsFilterU10 },
      { id: "u11", label: t.clubPage.teamsFilterU11 },
      { id: "u12", label: t.clubPage.teamsFilterU12 },
      { id: "u13plus", label: t.clubPage.teamsFilterU13Plus },
      { id: "seniors", label: t.clubPage.teamsFilterSeniors },
      { id: "girls_women", label: t.clubPage.teamsFilterGirlsWomen },
    ],
    [t.clubPage]
  );

  const filtered = useMemo(() => {
    return teams.filter((team) => {
      if (bucket !== "all" && inferPublicTeamAgeBucket(team.age_group, team.name) !== bucket) return false;
      return matchesSectionFilter(search, team.name, team.sport, team.age_group ?? undefined);
    });
  }, [bucket, search, teams]);

  return (
    <PublicClubPageGate section="teams">
      <PublicClubSection title={t.clubPage.teamsPublicPageTitle}>
        {loadingData ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : teams.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-8 text-center">
            <div className="text-sm font-medium text-[color:var(--club-foreground)]">{t.clubPage.noTeamsYet}</div>
            <div className="mt-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.teamsWillAppear}</div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBucket(tab.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      bucket === tab.id
                        ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
                        : "border-[color:var(--club-border)] text-[color:var(--club-muted)] hover:border-[color:var(--club-primary)]/40 hover:text-[color:var(--club-foreground)]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="w-full shrink-0 sm:max-w-xs">
                <Input
                  id="public-club-teams-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.clubPage.sectionSearchTeams}
                  className="rounded-xl border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)] placeholder:text-[color:var(--club-muted)]"
                />
              </div>
            </div>

            {!filtered.length ? (
              <div className="mx-auto max-w-2xl rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-center text-sm text-[color:var(--club-muted)]">
                {t.clubPage.noSearchResults}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((team) => {
                  const seg = encodePublicTeamPathSegment(team);
                  const next = nextTrainingByTeam.get(team.id);
                  const coachPub = publicCoachCountByTeamId[team.id] ?? 0;
                  return (
                    <Link
                      key={team.id}
                      to={`${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.teams}/${seg}${searchSuffix}`}
                      className="flex h-full flex-col rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-5 text-left text-inherit no-underline shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-colors hover:border-[color:var(--club-primary)]/35"
                    >
                      <div
                        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: "var(--club-primary)" }}
                      >
                        <Trophy className="h-5 w-5" />
                      </div>
                      <h3 className="font-display mb-1 line-clamp-2 text-lg font-semibold tracking-tight text-[color:var(--club-foreground)]">{team.name}</h3>
                      <p className="mb-3 text-xs text-[color:var(--club-muted)]">
                        {team.sport}
                        {team.age_group ? ` · ${team.age_group}` : ""}
                      </p>
                      {next ? (
                        <div className="mb-3 border-t border-[color:var(--club-border)]/60 pt-3">
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">
                            {t.clubPage.teamUpcomingLabel}
                          </div>
                          <div className="flex items-start gap-1.5 text-xs text-[color:var(--club-muted)]">
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--club-primary)" }} />
                            <span className="line-clamp-3">
                              {new Date(next.starts_at).toLocaleString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {next.title ? ` · ${next.title}` : ""}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 flex-1 border-t border-[color:var(--club-border)]/40 pt-3 text-[11px] text-[color:var(--club-muted)]">
                          {t.clubPage.teamsNoUpcomingTrainingPreview}
                        </div>
                      )}
                      {coachPub > 0 ? (
                        <div className="mb-3 flex items-center gap-1.5 text-[11px] text-[color:var(--club-muted)]">
                          <Users className="h-3.5 w-3.5 shrink-0 text-[color:var(--club-primary)]" />
                          {t.clubPage.teamsPublicCoachCount.replace("{count}", String(coachPub))}
                        </div>
                      ) : null}
                      <div className="mt-auto flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--club-primary)" }}>
                        {t.clubPage.teamDetailLink}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
