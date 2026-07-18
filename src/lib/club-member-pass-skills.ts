import type {
  MemberProgressSnapshot,
  TrainingJournalEntry,
  TrainingJournalSelfRatings,
} from "@/lib/club-member-progress";

/** FIFA-style 40–99 attribute scores for the Member ID card back. */
export interface ClubPassSkillScores {
  overall: number;
  technique: number;
  fitness: number;
  tactics: number;
  mindset: number;
  attendance: number;
  competition: number;
}

export interface ClubPassMarketEstimate {
  /** Rounded EUR estimate from progress + skills (AI 4 T heuristic). */
  amountEur: number;
  /** Display string, e.g. "€ 42.000" */
  label: string;
  /** Confidence band for UI copy. */
  confidence: "low" | "medium" | "high";
}

export interface ClubPassSkillsSummary {
  scores: ClubPassSkillScores;
  market: ClubPassMarketEstimate;
  journalCount: number;
  hasJournalSkills: boolean;
  /** False when My Progress has no activity/journal yet — UI should show "—". */
  hasRecording: boolean;
}

/** Em dash used on the card back when there is no My Progress recording yet. */
export const CLUB_PASS_EMPTY_VALUE = "—";

/** Optional registry fields used when progress RPC stats are still sparse. */
export interface ClubPassMasterProgressHints {
  goalsCount?: number | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundScore(n: number) {
  return Math.round(clamp(n, 40, 99));
}

/** Map 1–5 self-rating to FUT-like 40–99 band. */
function ratingToScore(rating: number | null | undefined, fallback = 55) {
  if (rating == null || !Number.isFinite(rating)) return fallback;
  const r = clamp(rating, 1, 5);
  return roundScore(40 + ((r - 1) / 4) * 55);
}

export function averageJournalSelfRatings(
  entries: TrainingJournalEntry[],
): TrainingJournalSelfRatings | null {
  if (entries.length === 0) return null;
  const sum = entries.reduce(
    (acc, e) => ({
      technique: acc.technique + e.selfRatings.technique,
      fitness: acc.fitness + e.selfRatings.fitness,
      tactics: acc.tactics + e.selfRatings.tactics,
      mindset: acc.mindset + e.selfRatings.mindset,
    }),
    { technique: 0, fitness: 0, tactics: 0, mindset: 0 },
  );
  const n = entries.length;
  return {
    technique: sum.technique / n,
    fitness: sum.fitness / n,
    tactics: sum.tactics / n,
    mindset: sum.mindset / n,
  };
}

export function hasClubPassProgressRecording(
  snapshot: MemberProgressSnapshot,
  journalCount: number,
): boolean {
  return (
    journalCount > 0 ||
    snapshot.xp > 0 ||
    snapshot.matches > 0 ||
    snapshot.attended_trainings > 0 ||
    snapshot.confirmed_trainings > 0 ||
    snapshot.goals > 0 ||
    snapshot.assists > 0 ||
    snapshot.badge_count > 0 ||
    snapshot.attendance_streak > 0 ||
    snapshot.attendance_best_streak > 0
  );
}

/** Merge My Progress snapshot with optional master-registry hints. */
export function enrichClubPassSnapshot(
  snapshot: MemberProgressSnapshot,
  hints?: ClubPassMasterProgressHints | null,
): MemberProgressSnapshot {
  if (!hints) return snapshot;
  const goalsHint =
    typeof hints.goalsCount === "number" && Number.isFinite(hints.goalsCount)
      ? Math.max(0, Math.floor(hints.goalsCount))
      : 0;
  if (goalsHint <= snapshot.goals) return snapshot;
  return { ...snapshot, goals: goalsHint };
}

/**
 * Derive TEC/FIT/TAC/MND from My Progress KPIs when training-journal
 * self-ratings are not available on this device (e.g. admin Club Card view).
 */
export function progressDerivedSkillScores(snapshot: MemberProgressSnapshot): Pick<
  ClubPassSkillScores,
  "technique" | "fitness" | "tactics" | "mindset"
> {
  const technique = roundScore(
    42 +
      Math.min(28, snapshot.goals * 4.2) +
      Math.min(14, snapshot.xp / 10) +
      Math.min(10, snapshot.badge_count * 2),
  );
  const fitness = roundScore(
    42 +
      Math.min(28, snapshot.attended_trainings * 2.2) +
      Math.min(16, snapshot.attendance_streak * 2.2) +
      Math.min(10, snapshot.attendance_best_streak * 1.2),
  );
  const tactics = roundScore(
    42 +
      Math.min(24, snapshot.assists * 4) +
      Math.min(18, snapshot.matches * 1.6) +
      Math.min(10, snapshot.badge_count * 1.5),
  );
  const mindset = roundScore(
    42 +
      Math.min(20, snapshot.confirmed_trainings * 1.6) +
      Math.min(18, snapshot.attendance_best_streak * 1.8) +
      Math.min(14, Math.max(0, snapshot.level_index) * 3.5) +
      Math.min(8, snapshot.xp / 40),
  );
  return { technique, fitness, tactics, mindset };
}

function attendanceScore(snapshot: MemberProgressSnapshot): number {
  const rate =
    snapshot.confirmed_trainings > 0
      ? snapshot.attended_trainings / snapshot.confirmed_trainings
      : snapshot.attended_trainings > 0
        ? 1
        : 0;
  const volumeBoost = Math.min(18, snapshot.attended_trainings * 1.2);
  const streakBoost = Math.min(14, snapshot.attendance_streak * 1.6);
  return roundScore(40 + rate * 28 + volumeBoost + streakBoost);
}

function competitionScore(snapshot: MemberProgressSnapshot): number {
  const matchPts = Math.min(28, snapshot.matches * 2.2);
  const goalPts = Math.min(20, snapshot.goals * 3.5);
  const assistPts = Math.min(16, snapshot.assists * 2.8);
  return roundScore(40 + matchPts + goalPts + assistPts);
}

export function computeClubPassSkillScores(
  snapshot: MemberProgressSnapshot,
  journalAvg: TrainingJournalSelfRatings | null,
): ClubPassSkillScores {
  const fromProgress = progressDerivedSkillScores(snapshot);
  // Journal self-ratings (My Progress training notes) win when present;
  // otherwise use progress-KPI derived scores from the same My Progress snapshot.
  const technique = journalAvg
    ? ratingToScore(journalAvg.technique, fromProgress.technique)
    : fromProgress.technique;
  const fitness = journalAvg
    ? ratingToScore(journalAvg.fitness, fromProgress.fitness)
    : fromProgress.fitness;
  const tactics = journalAvg
    ? ratingToScore(journalAvg.tactics, fromProgress.tactics)
    : fromProgress.tactics;
  const mindset = journalAvg
    ? ratingToScore(journalAvg.mindset, fromProgress.mindset)
    : fromProgress.mindset;
  const attendance = attendanceScore(snapshot);
  const competition = competitionScore(snapshot);

  const overall = roundScore(
    technique * 0.2 +
      fitness * 0.15 +
      tactics * 0.15 +
      mindset * 0.15 +
      attendance * 0.2 +
      competition * 0.15,
  );

  return { overall, technique, fitness, tactics, mindset, attendance, competition };
}

function formatEur(amount: number, locale: "en" | "de" = "en"): string {
  const rounded = Math.round(amount / 500) * 500;
  const formatted = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(rounded);
  return formatted;
}

/**
 * Deterministic AI 4 T market-value heuristic from progress + skill profile.
 * Playful estimate for youth/amateur clubs — not a transfer-market valuation.
 */
export function estimateClubPassMarketValue(
  snapshot: MemberProgressSnapshot,
  scores: ClubPassSkillScores,
  journalCount: number,
  locale: "en" | "de" = "en",
): ClubPassMarketEstimate {
  const levelBoost = [1, 1.08, 1.18, 1.32, 1.5][Math.max(0, snapshot.level_index - 1)] ?? 1;
  const amount =
    4_500 +
    snapshot.xp * 110 +
    snapshot.goals * 2_400 +
    snapshot.assists * 1_700 +
    snapshot.matches * 750 +
    snapshot.badge_count * 1_400 +
    snapshot.attendance_streak * 180 +
    scores.overall * 95 +
    journalCount * 220;

  const scaled = Math.max(5_000, amount * levelBoost);
  const confidence: ClubPassMarketEstimate["confidence"] =
    journalCount >= 3 && snapshot.matches >= 5
      ? "high"
      : journalCount >= 1 || snapshot.matches >= 2 || snapshot.attended_trainings >= 5
        ? "medium"
        : "low";

  return {
    amountEur: Math.round(scaled / 500) * 500,
    label: formatEur(scaled, locale),
    confidence,
  };
}

export function buildClubPassSkillsSummary(
  snapshot: MemberProgressSnapshot | null | undefined,
  entries: TrainingJournalEntry[],
  locale: "en" | "de" = "en",
  hints?: ClubPassMasterProgressHints | null,
): ClubPassSkillsSummary | null {
  if (!snapshot) return null;
  const hasRecording = hasClubPassProgressRecording(snapshot, entries.length);
  // Only blend registry hints once My Progress already has real activity.
  const enriched = hasRecording ? enrichClubPassSnapshot(snapshot, hints) : snapshot;
  const journalAvg = averageJournalSelfRatings(entries);
  const scores = computeClubPassSkillScores(enriched, journalAvg);
  const market = hasRecording
    ? estimateClubPassMarketValue(enriched, scores, entries.length, locale)
    : {
        amountEur: 0,
        label: CLUB_PASS_EMPTY_VALUE,
        confidence: "low" as const,
      };
  return {
    scores,
    market,
    journalCount: entries.length,
    hasJournalSkills: journalAvg != null,
    hasRecording,
  };
}
