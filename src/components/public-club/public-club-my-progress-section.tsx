import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  ClipboardList,
  Flame,
  Loader2,
  LogIn,
  MessageSquare,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Ai4TInlineLabel, BrandedText } from "@/components/ai/Ai4TBrand";
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
import {
  clubModalFormInputClass,
  clubModalFormLabelClass,
} from "@/lib/public-club-glass-classes";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Light inset surface for interactive forms on club glass cards. */
const progressFormSurfaceClass = [
  "min-w-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white",
  "shadow-[0_8px_28px_rgba(15,23,42,0.08)]",
].join(" ");

/** Secondary copy on club-tinted glass — avoid brand `--club-muted` (often low contrast). */
const progressGlassBodyClass =
  "text-base leading-relaxed text-[color:var(--club-foreground)]/90";
const progressGlassHintClass =
  "text-base leading-relaxed text-[color:var(--club-foreground)]/85";

const progressFieldClass = cn(
  "box-border h-12 w-full min-w-0 max-w-full rounded-xl text-base text-neutral-900 [color-scheme:light]",
  clubModalFormInputClass,
);

const progressDateFieldClass = cn(
  progressFieldClass,
  // Mobile WebKit/Chromium date inputs have a large intrinsic min-width; force them into the frame.
  "block",
  "[&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-datetime-edit]:max-w-[100%]",
);

const progressTextareaClass = cn(
  "box-border min-h-[100px] w-full min-w-0 max-w-full rounded-xl text-base text-neutral-900 resize-y",
  clubModalFormInputClass,
);

const progressOptInSwitchClass = cn(
  "h-7 w-12 border border-neutral-300/90 shadow-inner",
  "data-[state=checked]:border-[color:var(--club-primary)] data-[state=checked]:bg-[color:var(--club-primary)]",
  "data-[state=unchecked]:bg-neutral-200",
  "focus-visible:ring-[color:var(--club-primary)]",
);

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white px-3.5 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-neutral-600">{label}</div>
      <div className="mt-2 font-display text-[1.75rem] font-bold tabular-nums leading-none tracking-tight text-neutral-900 sm:text-2xl">
        {value}
      </div>
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
  description: ReactNode;
  value: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="absolute inset-y-0 left-0 w-1 bg-[color:var(--club-primary)]" aria-hidden />
      <div className="flex items-start gap-3.5 pl-1.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-[color:var(--club-primary)] shadow-sm ring-1 ring-black/5">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-neutral-900">{title}</div>
          <p className="mt-1.5 text-base leading-relaxed text-neutral-600">{description}</p>
          <div className="mt-3 font-display text-xl font-bold tabular-nums tracking-tight text-neutral-900">
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
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-sm font-semibold text-neutral-800">{label}</span>
      <div
        className="flex w-full sm:w-auto sm:shrink-0 justify-between sm:justify-end gap-1.5 rounded-xl bg-neutral-100 p-1.5 sm:gap-1"
        role="group"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={cn(
              "inline-flex h-11 w-11 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-base sm:text-sm font-semibold leading-none transition-all",
              value >= n
                ? "bg-[color:var(--club-primary)] text-white shadow-sm"
                : "bg-transparent text-neutral-500 hover:bg-white hover:text-neutral-800",
            )}
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
            aria-pressed={value >= n}
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
      className="!border-t-0 !pt-6 sm:!pt-10"
      title={t.clubProgress.sectionTitle}
      titleClassName="!text-3xl sm:!text-4xl !mb-3"
      subtitle={
        <span className="block space-y-1.5">
          <span className="block text-base font-semibold text-[color:var(--club-foreground)] sm:text-lg">
            {t.clubProgress.heroTagline}
          </span>
          <span className="block text-base leading-relaxed text-[color:var(--club-foreground)]/85">
            <BrandedText text={t.clubProgress.sectionDesc} ai4tOnly />
          </span>
        </span>
      }
      subtitleClassName="!text-base !text-[color:var(--club-foreground)]/85 !max-w-3xl !mb-6 sm:!mb-8"
    >
      {checkingMembership || loading ? (
        <PublicClubCard className="flex items-center gap-2 py-6 text-base text-[color:var(--club-foreground)]/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t.common.loading}
        </PublicClubCard>
      ) : !user ? (
        <PublicClubCard className="space-y-4 p-5 sm:p-6">
          <p className="text-base leading-relaxed text-[color:var(--club-foreground)]/90">
            {t.clubProgress.signInTeaser}
          </p>
          <Button
            type="button"
            className={cn("h-11 gap-2 text-base", clubCtaFillHoverClass)}
            onClick={() => goToAuthWithReturn(`${basePath}${searchSuffix}`)}
          >
            <LogIn className="h-4 w-4" />
            {t.clubProgress.signInCta}
          </Button>
          {showAdminDraftEmptyHints ? (
            <p className="text-sm text-[color:var(--club-foreground)]/70">{t.clubProgress.draftHint}</p>
          ) : null}
        </PublicClubCard>
      ) : !isMember || !membershipId || !displaySnapshot ? (
        <PublicClubCard className="space-y-4 p-5 sm:p-6">
          <p className="text-base leading-relaxed text-[color:var(--club-foreground)]/90">
            {t.clubProgress.joinTeaser}
          </p>
          <Button
            type="button"
            className={cn("h-11 gap-2 text-base", clubCtaFillHoverClass)}
            onClick={() => setShowRequestInvite(true)}
          >
            <UserPlus className="h-4 w-4" />
            {t.clubProgress.joinCta}
          </Button>
        </PublicClubCard>
      ) : (
        <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-4">
          {loadSoftError ? (
            <PublicClubCard className="border-dashed p-4 text-base text-[color:var(--club-foreground)]/85">
              <BrandedText text={t.clubProgress.loadSoftNotice} ai4tOnly />
            </PublicClubCard>
          ) : null}

          <PublicClubCard className="relative overflow-hidden space-y-5 p-5 sm:p-7">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[color:var(--club-primary)]/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--club-primary)] shadow-md ring-1 ring-black/10">
                  <Trophy className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--club-foreground)]/70">
                    {t.clubProgress.levelLabel.replace(
                      "{level}",
                      t.clubProgress.levels[displaySnapshot.level] ?? displaySnapshot.level,
                    )}
                  </p>
                  <div className="mt-1 font-display text-3xl font-bold tracking-tight text-[color:var(--club-foreground)] sm:text-4xl">
                    {(t.clubProgress.levelNameOnly ?? "{level}").replace(
                      "{level}",
                      t.clubProgress.levels[displaySnapshot.level] ?? displaySnapshot.level,
                    )}
                  </div>
                  <p className="mt-2 text-base font-medium text-[color:var(--club-foreground)]/85">
                    {t.clubProgress.xpLabel
                      .replace("{xp}", String(displaySnapshot.xp))
                      .replace("{next}", String(displaySnapshot.next_level_xp))}
                  </p>
                </div>
              </div>
              <Link
                to={reportsHref}
                className="text-base font-semibold text-[color:var(--club-primary)] hover:underline"
              >
                {t.clubProgress.openReports}
              </Link>
            </div>
            {levelMeta ? (
              <div className="relative space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[color:var(--club-foreground)]/80">
                  <span>
                    {(t.clubProgress.xpToNext ?? "{pct}% to the next level").replace(
                      "{pct}",
                      String(Math.round(levelMeta.progress01 * 100)),
                    )}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/10 ring-1 ring-black/5">
                  <div
                    className="h-full rounded-full bg-[color:var(--club-primary)] transition-[width] duration-500"
                    style={{ width: `${Math.round(levelMeta.progress01 * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
            <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile label={t.clubProgress.kpiStreak} value={displaySnapshot.attendance_streak} />
              <KpiTile label={t.clubProgress.kpiBestStreak} value={displaySnapshot.attendance_best_streak} />
              <KpiTile label={t.clubProgress.kpiBadges} value={displaySnapshot.badge_count} />
              <KpiTile label={t.clubProgress.kpiMatches} value={displaySnapshot.matches} />
            </div>
            {hint ? (
              <p className={cn("relative flex items-start gap-2.5 rounded-2xl bg-white/90 px-3.5 py-3 shadow-sm", progressGlassHintClass)}>
                <Flame className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--club-support)]" />
                {t.clubProgress.nextBadgeHint
                  .replace("{count}", String(hint.remaining))
                  .replace("{badge}", t.clubProgress.badgeNames[hint.badgeType] ?? hint.badgeType)}
              </p>
            ) : (
              <p className={cn("relative rounded-2xl bg-white/90 px-3.5 py-3 shadow-sm", progressGlassHintClass)}>
                {t.clubProgress.emptyStartHint}
              </p>
            )}
          </PublicClubCard>

          <PublicClubCard className="space-y-4 p-5 sm:p-6">
            <div>
              <div className="font-display text-xl font-bold tracking-tight text-[color:var(--club-foreground)] sm:text-2xl">
                {t.clubProgress.pillarsTitle}
              </div>
              <p className={cn("mt-2", progressGlassBodyClass)}>
                {t.clubProgress.pillarsDesc}
              </p>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
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
                description={<BrandedText text={t.clubProgress.pillarSelfEvalDesc} ai4tOnly />}
                value={t.clubProgress.pillarSelfEvalValue.replace("{count}", String(journal.length))}
              />
            </div>
          </PublicClubCard>

          <PublicClubCard className="space-y-0 overflow-hidden p-0">
            <div className="flex flex-col gap-3.5 border-b border-white/20 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-6">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--club-primary)] shadow-md ring-1 ring-black/10">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-xl font-bold tracking-tight text-[color:var(--club-foreground)]">
                    {t.clubProgress.journalTitle}
                  </div>
                  <p className="mt-1.5 text-base leading-relaxed text-[color:var(--club-foreground)]/85">
                    <BrandedText text={t.clubProgress.journalDesc} ai4tOnly />
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className={cn("h-11 w-full shrink-0 gap-1.5 text-base sm:mt-0.5 sm:w-auto", clubCtaFillHoverClass)}
                onClick={openCoachTips}
              >
                <Ai4TInlineLabel
                  text={t.clubProgress.aiCoachCta}
                  logoClassName="h-5 w-5"
                  textClassName="font-semibold"
                />
              </Button>
            </div>

            <div className={cn(progressFormSurfaceClass, "m-3 space-y-5 p-4 sm:m-4 sm:p-5")}>
              <div className="grid min-w-0 gap-4">
                <div className="min-w-0">
                  <label className={cn(clubModalFormLabelClass, "mb-1.5 block text-sm")}>
                    {t.clubProgress.journalDate}
                  </label>
                  <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl sm:max-w-[12rem]">
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className={progressDateFieldClass}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className={cn(clubModalFormLabelClass, "mb-1.5 block text-sm")}>
                    {t.clubProgress.journalWhatIDid}
                  </label>
                  <Textarea
                    value={whatIDid}
                    onChange={(e) => setWhatIDid(e.target.value)}
                    placeholder={t.clubProgress.journalWhatIDidPh}
                    rows={3}
                    className={progressTextareaClass}
                  />
                </div>
                <div className="min-w-0">
                  <label className={cn(clubModalFormLabelClass, "mb-1.5 block text-sm")}>
                    {t.clubProgress.journalImprovements}
                  </label>
                  <Textarea
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    placeholder={t.clubProgress.journalImprovementsPh}
                    rows={3}
                    className={progressTextareaClass}
                  />
                </div>
              </div>

              <div className="space-y-3.5 rounded-2xl border border-neutral-200/90 bg-neutral-50 p-4 sm:p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.05em] text-neutral-700">
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
                className={cn("h-12 w-full gap-2 rounded-xl text-base font-semibold sm:w-auto sm:min-w-[11rem]", clubCtaFillHoverClass)}
                onClick={saveJournalEntry}
                disabled={!whatIDid.trim() && !improvements.trim()}
              >
                {t.clubProgress.journalSave}
              </Button>

              {journal.length > 0 ? (
                <ul className="space-y-2.5 border-t border-neutral-200 pt-4">
                  {journal.slice(0, 5).map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-neutral-200/90 bg-white px-3.5 py-3.5 text-base shadow-sm"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.05em] text-neutral-600">
                        {entry.sessionDate}
                      </div>
                      {entry.whatIDid ? (
                        <p className="mt-1.5 text-base font-medium leading-snug text-neutral-900">{entry.whatIDid}</p>
                      ) : null}
                      {entry.improvements ? (
                        <p className="mt-1 text-base leading-relaxed text-neutral-700">
                          {t.clubProgress.journalImprovements}: {entry.improvements}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm tabular-nums text-neutral-600">
                        {t.clubProgress.skillTechnique} {entry.selfRatings.technique} ·{" "}
                        {t.clubProgress.skillFitness} {entry.selfRatings.fitness} ·{" "}
                        {t.clubProgress.skillTactics} {entry.selfRatings.tactics} ·{" "}
                        {t.clubProgress.skillMindset} {entry.selfRatings.mindset}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3.5 py-3.5 text-base font-medium leading-relaxed text-neutral-700">
                  {t.clubProgress.journalEmpty}
                </p>
              )}
            </div>
          </PublicClubCard>

          {displaySnapshot.badges.length > 0 ? (
            <PublicClubCard className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[color:var(--club-foreground)]">
                <Award className="h-5 w-5 text-[color:var(--club-primary)]" />
                {t.clubProgress.badgesTitle}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {displaySnapshot.badges.slice(0, 8).map((badge) => {
                  const Icon = getAchievementBadgeIcon(badge.badge_type);
                  const label = t.clubProgress.badgeNames[badge.badge_type] ?? badge.badge_name;
                  return (
                    <div
                      key={`${badge.badge_type}-${badge.earned_at ?? badge.id ?? label}`}
                      className="flex min-w-[84px] flex-col items-center gap-1.5 rounded-xl border border-neutral-200/90 bg-white px-3 py-3 shadow-sm"
                      title={label}
                    >
                      <Icon className="h-6 w-6 text-[color:var(--club-primary)]" strokeWidth={1.5} />
                      <span className="text-center text-sm font-medium leading-tight text-neutral-800">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </PublicClubCard>
          ) : null}

          {challenge && challenge.teams.length > 0 ? (
            <PublicClubCard className="space-y-3 p-5 sm:p-6">
              <div className="font-display text-xl font-bold tracking-tight text-[color:var(--club-foreground)]">
                {t.clubProgress.teamChallengeTitle}
              </div>
              <p className={progressGlassBodyClass}>{t.clubProgress.teamChallengeDesc}</p>
              {myTeamRank ? (
                <p className="text-base font-semibold text-[color:var(--club-foreground)]">
                  {t.clubProgress.yourTeamRank
                    .replace("{rank}", String(myTeamRank.rank))
                    .replace("{total}", String(challenge.teams.length))
                    .replace("{rate}", String(myTeamRank.rate_pct))}
                </p>
              ) : null}
              <ul className="space-y-2">
                {challenge.teams.slice(0, 6).map((row) => (
                  <li
                    key={row.team_id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-white/40 bg-white px-3.5 py-3 text-base text-neutral-900 shadow-sm",
                      row.is_mine && "ring-2 ring-[color:var(--club-primary)]/35",
                    )}
                  >
                    <span>
                      #{row.rank}{" "}
                      {challenge.is_staff && row.team_name ? row.team_name : row.anonymous_label}
                      {row.is_mine ? ` · ${t.clubProgress.yourTeam}` : ""}
                    </span>
                    <span className="tabular-nums font-semibold text-neutral-700">{row.rate_pct}%</span>
                  </li>
                ))}
              </ul>
              {isStaff && lowAttendance ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" className={cn("h-11 gap-1.5 text-base", clubCtaFillHoverClass)} onClick={openNudge}>
                    <Ai4TInlineLabel
                      text={t.clubProgress.aiNudgeCta}
                      logoClassName="h-5 w-5"
                      textClassName="font-semibold"
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("h-11 gap-1.5 text-base", clubCtaOutlineButtonClass)}
                    onClick={() => openCommunicationModal()}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t.clubProgress.messagesNudgeCta}
                  </Button>
                </div>
              ) : null}
            </PublicClubCard>
          ) : (
            <PublicClubCard className="space-y-2 p-5 sm:p-6">
              <div className="font-display text-xl font-bold tracking-tight text-[color:var(--club-foreground)]">
                {t.clubProgress.teamChallengeTitle}
              </div>
              <p className={progressGlassBodyClass}>{t.clubProgress.challengeEmpty}</p>
            </PublicClubCard>
          )}

          {seasonLine ? (
            <PublicClubCard className={cn("p-5", progressGlassBodyClass)}>{seasonLine}</PublicClubCard>
          ) : null}

          {canOptIn ? (
            <PublicClubCard className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200/90 bg-white px-4 py-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold leading-snug text-neutral-900">
                    {t.clubProgress.publicBadgesOptIn}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 sm:text-base">
                    {t.clubProgress.publicBadgesOptInDesc}
                  </p>
                </div>
                <Switch
                  checked={displaySnapshot.public_badges_opt_in}
                  disabled={optInBusy}
                  onCheckedChange={(c) => void toggleOptIn(Boolean(c))}
                  className={cn(
                    progressOptInSwitchClass,
                    "[&>span]:h-6 [&>span]:w-6 [&>span]:bg-white [&>span]:shadow-md [&>span]:ring-1 [&>span]:ring-black/10",
                  )}
                  aria-label={t.clubProgress.publicBadgesOptIn}
                />
              </div>
            </PublicClubCard>
          ) : null}
        </div>
      )}
    </PublicClubSection>
  );
}
