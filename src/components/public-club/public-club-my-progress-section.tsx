import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  ClipboardList,
  Flame,
  Loader2,
  LogIn,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { getAchievementBadgeIcon } from "@/lib/achievement-badge-icons";
import {
  buildTrainingCoachPrompt,
  canOptInPublicBadges,
  emptyMemberProgressSnapshot,
  fetchMemberProgressSnapshot,
  fetchTeamAttendanceChallenge,
  levelFromXp,
  loadTrainingJournal,
  nextBadgeHint,
  saveTrainingJournal,
  setPublicBadgesOptIn,
  type MemberProgressSnapshot,
  type TeamAttendanceChallenge,
  type TrainingJournalEntry,
  type TrainingJournalSelfRatings,
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

function PillarCard({
  icon: Icon,
  title,
  description,
  value,
}: {
  icon: typeof Target;
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--club-border)]/40 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/10 p-2 text-[color:var(--club-primary)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[color:var(--club-foreground)]">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--club-muted)]">{description}</p>
          <div className="mt-2 font-display text-lg font-bold tabular-nums text-[color:var(--club-foreground)]">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_RATINGS: TrainingJournalSelfRatings = {
  technique: 3,
  fitness: 3,
  tactics: 3,
  mindset: 3,
};

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[color:var(--club-muted)]">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={cn(
              "h-7 w-7 rounded-lg text-xs font-semibold transition-colors",
              value >= n
                ? "bg-[color:var(--club-primary)] text-white"
                : "bg-white/10 text-[color:var(--club-muted)] hover:bg-white/15",
            )}
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
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
  const [loadSoftError, setLoadSoftError] = useState(false);
  const [challenge, setChallenge] = useState<TeamAttendanceChallenge | null>(null);
  const [seasonLine, setSeasonLine] = useState<string | null>(null);
  const [optInBusy, setOptInBusy] = useState(false);
  const [journal, setJournal] = useState<TrainingJournalEntry[]>([]);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [whatIDid, setWhatIDid] = useState("");
  const [improvements, setImprovements] = useState("");
  const [selfRatings, setSelfRatings] = useState<TrainingJournalSelfRatings>(DEFAULT_RATINGS);

  const reportsHref = `${basePath}/reports${searchSuffix}`;
  const isStaff =
    membershipRole === "trainer" ||
    membershipRole === "club_admin" ||
    membershipRole === "admin";

  useEffect(() => {
    if (!club?.id || !membershipId || !isMember) {
      setSnapshot(null);
      setChallenge(null);
      setLoadSoftError(false);
      setJournal([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setJournal(loadTrainingJournal(club.id, membershipId));
    void (async () => {
      const [progressRes, challengeRes] = await Promise.all([
        fetchMemberProgressSnapshot(club.id, membershipId, membershipRole ?? "member"),
        fetchTeamAttendanceChallenge(club.id, 30),
      ]);
      if (cancelled) return;
      setSnapshot(progressRes.data);
      setLoadSoftError(Boolean(progressRes.error));
      setChallenge(challengeRes.data);

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
          } else if (
            progressRes.data.goals > 0 ||
            progressRes.data.assists > 0 ||
            progressRes.data.matches > 0
          ) {
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
  }, [club?.id, isMember, isStaff, membershipId, membershipRole, t.clubProgress]);

  const displaySnapshot = useMemo(() => {
    if (snapshot) return snapshot;
    if (membershipId) return emptyMemberProgressSnapshot(membershipId, membershipRole ?? "member");
    return null;
  }, [membershipId, membershipRole, snapshot]);

  const levelMeta = useMemo(() => {
    if (!displaySnapshot) return null;
    return levelFromXp(displaySnapshot.xp);
  }, [displaySnapshot]);

  const hint = displaySnapshot ? nextBadgeHint(displaySnapshot) : null;
  const myTeamRank = challenge?.teams.find((row) => row.is_mine) ?? null;
  const lowAttendance =
    isStaff &&
    (challenge?.teams.some((row) => row.is_mine && row.rate_pct < 60) ||
      (challenge?.teams[0] != null && challenge.teams[0].rate_pct < 55));

  const canOptIn = canOptInPublicBadges(membershipRole ?? displaySnapshot?.role);
  const attendanceRate =
    displaySnapshot && displaySnapshot.confirmed_trainings > 0
      ? Math.round((displaySnapshot.attended_trainings / displaySnapshot.confirmed_trainings) * 100)
      : displaySnapshot?.attended_trainings
        ? 100
        : 0;

  async function toggleOptIn(next: boolean) {
    if (!club?.id || !canOptIn || !displaySnapshot) return;
    setOptInBusy(true);
    const res = await setPublicBadgesOptIn(club.id, next);
    if (res.ok) setSnapshot({ ...displaySnapshot, public_badges_opt_in: next });
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

  function saveJournalEntry() {
    if (!club?.id || !membershipId) return;
    const trimmedDid = whatIDid.trim();
    const trimmedImprove = improvements.trim();
    if (!trimmedDid && !trimmedImprove) return;
    const entry: TrainingJournalEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sessionDate: sessionDate || new Date().toISOString().slice(0, 10),
      whatIDid: trimmedDid,
      improvements: trimmedImprove,
      selfRatings: { ...selfRatings },
    };
    const next = [entry, ...journal].slice(0, 40);
    setJournal(next);
    saveTrainingJournal(club.id, membershipId, next);
    setWhatIDid("");
    setImprovements("");
    setSelfRatings(DEFAULT_RATINGS);
  }

  function openCoachTips() {
    if (!displaySnapshot || !levelMeta) return;
    openAi4tModal(
      buildTrainingCoachPrompt({
        entries: journal,
        levelLabel: t.clubProgress.levels[displaySnapshot.level] ?? displaySnapshot.level,
        xp: displaySnapshot.xp,
        streak: displaySnapshot.attendance_streak,
        matches: displaySnapshot.matches,
      }),
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
      ) : !isMember || !membershipId || !displaySnapshot ? (
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
      ) : (
        <div className="space-y-4">
          {loadSoftError ? (
            <PublicClubCard className="border-dashed p-4 text-sm text-[color:var(--club-muted)]">
              {t.clubProgress.loadSoftNotice}
            </PublicClubCard>
          ) : null}

          <PublicClubCard className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                  <Trophy className="h-4 w-4 text-[color:var(--club-primary)]" />
                  {t.clubProgress.levelLabel.replace(
                    "{level}",
                    t.clubProgress.levels[displaySnapshot.level] ?? displaySnapshot.level,
                  )}
                </div>
                <p className="mt-1 text-xs text-[color:var(--club-muted)]">
                  {t.clubProgress.xpLabel
                    .replace("{xp}", String(displaySnapshot.xp))
                    .replace("{next}", String(displaySnapshot.next_level_xp))}
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
              <KpiTile label={t.clubProgress.kpiStreak} value={displaySnapshot.attendance_streak} />
              <KpiTile label={t.clubProgress.kpiBestStreak} value={displaySnapshot.attendance_best_streak} />
              <KpiTile label={t.clubProgress.kpiBadges} value={displaySnapshot.badge_count} />
              <KpiTile label={t.clubProgress.kpiMatches} value={displaySnapshot.matches} />
            </div>
            {hint ? (
              <p className="flex items-start gap-2 text-xs text-[color:var(--club-muted)]">
                <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--club-support)]" />
                {t.clubProgress.nextBadgeHint
                  .replace("{count}", String(hint.remaining))
                  .replace("{badge}", t.clubProgress.badgeNames[hint.badgeType] ?? hint.badgeType)}
              </p>
            ) : (
              <p className="text-xs text-[color:var(--club-muted)]">{t.clubProgress.emptyStartHint}</p>
            )}
          </PublicClubCard>

          <PublicClubCard className="space-y-3 p-5">
            <div>
              <div className="text-sm font-semibold text-[color:var(--club-foreground)]">
                {t.clubProgress.pillarsTitle}
              </div>
              <p className="mt-1 text-xs text-[color:var(--club-muted)]">{t.clubProgress.pillarsDesc}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <PillarCard
                icon={ClipboardList}
                title={t.clubProgress.pillarAttendanceTitle}
                description={t.clubProgress.pillarAttendanceDesc}
                value={t.clubProgress.pillarAttendanceValue
                  .replace("{attended}", String(displaySnapshot.attended_trainings))
                  .replace("{confirmed}", String(displaySnapshot.confirmed_trainings))
                  .replace("{rate}", String(attendanceRate))}
              />
              <PillarCard
                icon={Users}
                title={t.clubProgress.pillarSelectionTitle}
                description={t.clubProgress.pillarSelectionDesc}
                value={t.clubProgress.pillarSelectionValue
                  .replace("{matches}", String(displaySnapshot.matches))
                  .replace("{goals}", String(displaySnapshot.goals))
                  .replace("{assists}", String(displaySnapshot.assists))}
              />
              <PillarCard
                icon={Target}
                title={t.clubProgress.pillarSelfEvalTitle}
                description={t.clubProgress.pillarSelfEvalDesc}
                value={t.clubProgress.pillarSelfEvalValue.replace("{count}", String(journal.length))}
              />
            </div>
          </PublicClubCard>

          <PublicClubCard className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                  <ClipboardList className="h-4 w-4 text-[color:var(--club-primary)]" />
                  {t.clubProgress.journalTitle}
                </div>
                <p className="mt-1 text-xs text-[color:var(--club-muted)]">{t.clubProgress.journalDesc}</p>
              </div>
              <Button
                type="button"
                size="sm"
                className={cn("gap-1.5", clubCtaFillHoverClass)}
                onClick={openCoachTips}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t.clubProgress.aiCoachCta}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[color:var(--club-muted)]">
                  {t.clubProgress.journalDate}
                </label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[color:var(--club-muted)]">
                    {t.clubProgress.journalWhatIDid}
                  </label>
                  <Textarea
                    value={whatIDid}
                    onChange={(e) => setWhatIDid(e.target.value)}
                    placeholder={t.clubProgress.journalWhatIDidPh}
                    rows={2}
                    className="bg-white/5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[color:var(--club-muted)]">
                    {t.clubProgress.journalImprovements}
                  </label>
                  <Textarea
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    placeholder={t.clubProgress.journalImprovementsPh}
                    rows={2}
                    className="bg-white/5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-[color:var(--club-border)]/30 bg-white/5 p-3">
              <div className="text-xs font-semibold text-[color:var(--club-foreground)]">
                {t.clubProgress.selfEvalTitle}
              </div>
              <RatingRow
                label={t.clubProgress.skillTechnique}
                value={selfRatings.technique}
                onChange={(technique) => setSelfRatings((r) => ({ ...r, technique }))}
              />
              <RatingRow
                label={t.clubProgress.skillFitness}
                value={selfRatings.fitness}
                onChange={(fitness) => setSelfRatings((r) => ({ ...r, fitness }))}
              />
              <RatingRow
                label={t.clubProgress.skillTactics}
                value={selfRatings.tactics}
                onChange={(tactics) => setSelfRatings((r) => ({ ...r, tactics }))}
              />
              <RatingRow
                label={t.clubProgress.skillMindset}
                value={selfRatings.mindset}
                onChange={(mindset) => setSelfRatings((r) => ({ ...r, mindset }))}
              />
            </div>

            <Button
              type="button"
              className={cn("gap-2", clubCtaFillHoverClass)}
              onClick={saveJournalEntry}
              disabled={!whatIDid.trim() && !improvements.trim()}
            >
              {t.clubProgress.journalSave}
            </Button>

            {journal.length > 0 ? (
              <ul className="space-y-2 border-t border-[color:var(--club-border)]/30 pt-3">
                {journal.slice(0, 5).map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-[color:var(--club-border)]/30 bg-white/5 px-3 py-2 text-sm"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">
                      {entry.sessionDate}
                    </div>
                    {entry.whatIDid ? (
                      <p className="mt-1 text-[color:var(--club-foreground)]">{entry.whatIDid}</p>
                    ) : null}
                    {entry.improvements ? (
                      <p className="mt-1 text-xs text-[color:var(--club-muted)]">
                        {t.clubProgress.journalImprovements}: {entry.improvements}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-[color:var(--club-muted)]">
                      {t.clubProgress.skillTechnique} {entry.selfRatings.technique} ·{" "}
                      {t.clubProgress.skillFitness} {entry.selfRatings.fitness} ·{" "}
                      {t.clubProgress.skillTactics} {entry.selfRatings.tactics} ·{" "}
                      {t.clubProgress.skillMindset} {entry.selfRatings.mindset}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[color:var(--club-muted)]">{t.clubProgress.journalEmpty}</p>
            )}
          </PublicClubCard>

          {displaySnapshot.badges.length > 0 ? (
            <PublicClubCard className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                <Award className="h-4 w-4 text-[color:var(--club-primary)]" />
                {t.clubProgress.badgesTitle}
              </div>
              <div className="flex flex-wrap gap-2">
                {displaySnapshot.badges.slice(0, 8).map((badge) => {
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
          ) : (
            <PublicClubCard className="space-y-2 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--club-foreground)]">
                <Sparkles className="h-4 w-4 text-[color:var(--club-primary)]" />
                {t.clubProgress.teamChallengeTitle}
              </div>
              <p className="text-xs text-[color:var(--club-muted)]">{t.clubProgress.challengeEmpty}</p>
            </PublicClubCard>
          )}

          {seasonLine ? (
            <PublicClubCard className="p-4 text-sm text-[color:var(--club-muted)]">{seasonLine}</PublicClubCard>
          ) : null}

          {canOptIn ? (
            <PublicClubCard className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-medium text-[color:var(--club-foreground)]">
                  {t.clubProgress.publicBadgesOptIn}
                </div>
                <p className="mt-0.5 text-[11px] text-[color:var(--club-muted)]">
                  {t.clubProgress.publicBadgesOptInDesc}
                </p>
              </div>
              <Switch
                checked={displaySnapshot.public_badges_opt_in}
                disabled={optInBusy}
                onCheckedChange={(c) => void toggleOptIn(Boolean(c))}
              />
            </PublicClubCard>
          ) : null}
        </div>
      )}
    </PublicClubSection>
  );
}
