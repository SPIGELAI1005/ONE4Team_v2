import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Flame,
  Loader2,
  LogIn,
  MessageSquare,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { getAchievementBadgeIcon } from "@/lib/achievement-badge-icons";
import {
  canOptInPublicBadges,
  fetchMemberProgressSnapshot,
  fetchTeamAttendanceChallenge,
  levelFromXp,
  nextBadgeHint,
  setPublicBadgesOptIn,
  type MemberProgressSnapshot,
  type TeamAttendanceChallenge,
} from "@/lib/club-member-progress";
import { clubCtaFillHoverClass, clubCtaOutlineButtonClass } from "@/lib/public-club-cta-classes";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--club-border)]/40 bg-white/5 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">{label}</div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums text-[color:var(--club-foreground)]">{value}</div>
    </div>
  );
}

export function PublicClubMyProgressSection() {
  const { t } = useLanguage();
  const {
    club,
    basePath,
    searchSuffix,
    user,
    isMember,
    membershipId,
    membershipRole,
    checkingMembership,
    goToAuthWithReturn,
    setShowRequestInvite,
    openAi4tModal,
    openCommunicationModal,
    showAdminDraftEmptyHints,
  } = usePublicClub();

  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<MemberProgressSnapshot | null>(null);
  const [challenge, setChallenge] = useState<TeamAttendanceChallenge | null>(null);
  const [seasonLine, setSeasonLine] = useState<string | null>(null);
  const [optInBusy, setOptInBusy] = useState(false);

  const reportsHref = `${basePath}/reports${searchSuffix}`;
  const isStaff =
    membershipRole === "trainer" ||
    membershipRole === "club_admin" ||
    membershipRole === "admin";

  useEffect(() => {
    if (!club?.id || !membershipId || !isMember) {
      setSnapshot(null);
      setChallenge(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [progressRes, challengeRes] = await Promise.all([
        fetchMemberProgressSnapshot(club.id, membershipId),
        fetchTeamAttendanceChallenge(club.id, 30),
      ]);
      if (cancelled) return;
      setSnapshot(progressRes.data);
      setChallenge(challengeRes.data);

      // Season awards: staff see named highlights; players get a private participation hint.
      try {
        const { data } = await supabase.rpc("get_season_award_winners", { _club_id: club.id });
        if (!cancelled) {
          const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
          const parts: string[] = [];
          if (isStaff && row) {
            const boot = row.golden_boot_display_name;
            const play = row.playmaker_display_name;
            const reliable = row.reliable_display_name;
            if (boot) parts.push(`${t.clubProgress.awardGoldenBoot}: ${String(boot)}`);
            if (play) parts.push(`${t.clubProgress.awardPlaymaker}: ${String(play)}`);
            if (reliable) parts.push(`${t.clubProgress.awardReliable}: ${String(reliable)}`);
          } else if (progressRes.data && (progressRes.data.goals > 0 || progressRes.data.assists > 0 || progressRes.data.matches > 0)) {
            parts.push(t.clubProgress.seasonPersonalHint);
          }
          setSeasonLine(parts.length ? parts.join(" · ") : null);
        }
      } catch {
        /* RPC optional */
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id, isMember, isStaff, membershipId, t.clubProgress]);

  const levelMeta = useMemo(() => {
    if (!snapshot) return null;
    return levelFromXp(snapshot.xp);
  }, [snapshot]);

  const hint = snapshot ? nextBadgeHint(snapshot) : null;
  const myTeamRank = challenge?.teams.find((row) => row.is_mine) ?? null;
  const lowAttendance =
    isStaff &&
    (challenge?.teams.some((row) => row.is_mine && row.rate_pct < 60) ||
      (challenge?.teams[0] != null && challenge.teams[0].rate_pct < 55));

  const canOptIn = canOptInPublicBadges(membershipRole ?? snapshot?.role);

  async function toggleOptIn(next: boolean) {
    if (!club?.id || !canOptIn) return;
    setOptInBusy(true);
    const res = await setPublicBadgesOptIn(club.id, next);
    if (res.ok && snapshot) setSnapshot({ ...snapshot, public_badges_opt_in: next });
    setOptInBusy(false);
  }

  function openNudge() {
    const teamLabel = myTeamRank?.team_name || myTeamRank?.anonymous_label || "the team";
    const rate = myTeamRank?.rate_pct ?? challenge?.teams[0]?.rate_pct;
    openAi4tModal(
      t.clubProgress.aiNudgePrompt
        .replace("{team}", teamLabel)
        .replace("{rate}", rate != null ? String(rate) : "—"),
    );
  }

  if (!club) return null;

  return (
    <PublicClubSection
      id="my-progress"
      title={t.clubProgress.sectionTitle}
      description={t.clubProgress.sectionDesc}
    >
      {checkingMembership || loading ? (
        <PublicClubCard className="flex items-center gap-2 py-6 text-sm text-[color:var(--club-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.common.loading}
        </PublicClubCard>
      ) : !user ? (
        <PublicClubCard className="space-y-3 p-5">
          <p className="text-sm text-[color:var(--club-muted)]">{t.clubProgress.signInTeaser}</p>
          <Button
            type="button"
            className={cn("gap-2", clubCtaFillHoverClass)}
            onClick={() => goToAuthWithReturn(`${basePath}${searchSuffix}`)}
          >
            <LogIn className="h-4 w-4" />
            {t.clubProgress.signInCta}
          </Button>
          {showAdminDraftEmptyHints ? (
            <p className="text-[11px] text-[color:var(--club-muted)]">{t.clubProgress.draftHint}</p>
          ) : null}
        </PublicClubCard>
      ) : !isMember || !membershipId ? (
        <PublicClubCard className="space-y-3 p-5">
          <p className="text-sm text-[color:var(--club-muted)]">{t.clubProgress.joinTeaser}</p>
          <Button
            type="button"
            className={cn("gap-2", clubCtaFillHoverClass)}
            onClick={() => setShowRequestInvite(true)}
          >
            <UserPlus className="h-4 w-4" />
            {t.clubProgress.joinCta}
          </Button>
        </PublicClubCard>
      ) : snapshot ? (
        <div className="space-y-4">
          <PublicClubCard className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                  <Trophy className="h-4 w-4 text-[color:var(--club-primary)]" />
                  {t.clubProgress.levelLabel.replace(
                    "{level}",
                    t.clubProgress.levels[snapshot.level] ?? snapshot.level,
                  )}
                </div>
                <p className="mt-1 text-xs text-[color:var(--club-muted)]">
                  {t.clubProgress.xpLabel
                    .replace("{xp}", String(snapshot.xp))
                    .replace("{next}", String(snapshot.next_level_xp))}
                </p>
              </div>
              <Link
                to={reportsHref}
                className="text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
              >
                {t.clubProgress.openReports}
              </Link>
            </div>
            {levelMeta ? (
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[color:var(--club-primary)] transition-[width]"
                  style={{ width: `${Math.round(levelMeta.progress01 * 100)}%` }}
                />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile label={t.clubProgress.kpiStreak} value={snapshot.attendance_streak} />
              <KpiTile label={t.clubProgress.kpiBestStreak} value={snapshot.attendance_best_streak} />
              <KpiTile label={t.clubProgress.kpiBadges} value={snapshot.badge_count} />
              <KpiTile label={t.clubProgress.kpiMatches} value={snapshot.matches} />
            </div>
            {hint ? (
              <p className="flex items-start gap-2 text-xs text-[color:var(--club-muted)]">
                <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--club-support)]" />
                {t.clubProgress.nextBadgeHint
                  .replace("{count}", String(hint.remaining))
                  .replace("{badge}", t.clubProgress.badgeNames[hint.badgeType] ?? hint.badgeType)}
              </p>
            ) : null}
          </PublicClubCard>

          {snapshot.badges.length > 0 ? (
            <PublicClubCard className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                <Award className="h-4 w-4 text-[color:var(--club-primary)]" />
                {t.clubProgress.badgesTitle}
              </div>
              <div className="flex flex-wrap gap-2">
                {snapshot.badges.slice(0, 8).map((badge) => {
                  const Icon = getAchievementBadgeIcon(badge.badge_type);
                  const label = t.clubProgress.badgeNames[badge.badge_type] ?? badge.badge_name;
                  return (
                    <div
                      key={`${badge.badge_type}-${badge.earned_at ?? badge.id ?? label}`}
                      className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl border border-[color:var(--club-border)]/40 bg-white/5 px-2 py-2"
                      title={label}
                    >
                      <Icon className="h-5 w-5 text-[color:var(--club-primary)]" strokeWidth={1.5} />
                      <span className="text-center text-[10px] font-medium leading-tight text-[color:var(--club-foreground)]">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </PublicClubCard>
          ) : null}

          {challenge && challenge.teams.length > 0 ? (
            <PublicClubCard className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                <Sparkles className="h-4 w-4 text-[color:var(--club-primary)]" />
                {t.clubProgress.teamChallengeTitle}
              </div>
              <p className="text-xs text-[color:var(--club-muted)]">{t.clubProgress.teamChallengeDesc}</p>
              {myTeamRank ? (
                <p className="text-sm text-[color:var(--club-foreground)]">
                  {t.clubProgress.yourTeamRank
                    .replace("{rank}", String(myTeamRank.rank))
                    .replace("{total}", String(challenge.teams.length))
                    .replace("{rate}", String(myTeamRank.rate_pct))}
                </p>
              ) : null}
              <ul className="space-y-1.5">
                {challenge.teams.slice(0, 6).map((row) => (
                  <li
                    key={row.team_id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-[color:var(--club-border)]/30 px-3 py-2 text-sm",
                      row.is_mine && "bg-white/5",
                    )}
                  >
                    <span className="text-[color:var(--club-foreground)]">
                      #{row.rank}{" "}
                      {challenge.is_staff && row.team_name ? row.team_name : row.anonymous_label}
                      {row.is_mine ? ` · ${t.clubProgress.yourTeam}` : ""}
                    </span>
                    <span className="tabular-nums text-[color:var(--club-muted)]">{row.rate_pct}%</span>
                  </li>
                ))}
              </ul>
              {isStaff && lowAttendance ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" className={cn("gap-1.5", clubCtaFillHoverClass)} onClick={openNudge}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t.clubProgress.aiNudgeCta}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("gap-1.5", clubCtaOutlineButtonClass)}
                    onClick={() => openCommunicationModal()}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.clubProgress.messagesNudgeCta}
                  </Button>
                </div>
              ) : null}
            </PublicClubCard>
          ) : null}

          {seasonLine ? (
            <PublicClubCard className="p-4 text-sm text-[color:var(--club-muted)]">{seasonLine}</PublicClubCard>
          ) : null}

          {canOptIn ? (
            <PublicClubCard className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--club-foreground)]">
                  {t.clubProgress.publicBadgesOptIn}
                </div>
                <p className="mt-0.5 text-[11px] text-[color:var(--club-muted)]">{t.clubProgress.publicBadgesOptInDesc}</p>
              </div>
              <Switch
                checked={snapshot.public_badges_opt_in}
                disabled={optInBusy}
                onCheckedChange={(c) => void toggleOptIn(Boolean(c))}
              />
            </PublicClubCard>
          ) : null}
        </div>
      ) : (
        <PublicClubCard className="p-5 text-sm text-[color:var(--club-muted)]">{t.clubProgress.loadError}</PublicClubCard>
      )}
    </PublicClubSection>
  );
}
