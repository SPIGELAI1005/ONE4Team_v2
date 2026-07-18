import { useCallback, useEffect, useMemo, useState } from "react";
import {
  emptyMemberProgressSnapshot,
  fetchMemberProgressSnapshot,
  loadTrainingJournal,
  type MemberProgressSnapshot,
} from "@/lib/club-member-progress";
import {
  buildClubPassSkillsSummary,
  type ClubPassMasterProgressHints,
  type ClubPassSkillsSummary,
} from "@/lib/club-member-pass-skills";
import { useLanguage } from "@/hooks/use-language";

export interface UseClubPassSkillsArgs {
  clubId?: string | null;
  membershipId?: string | null;
  /** When false, skip network fetch (e.g. modal closed). */
  enabled?: boolean;
  /** Optional master-registry hints (e.g. goals_count) blended into scoring. */
  masterHints?: ClubPassMasterProgressHints | null;
}

export interface UseClubPassSkillsResult {
  skillsSummary: ClubPassSkillsSummary | null;
  levelLabel: string | undefined;
  xpValue: number | undefined;
  estimateGeneratedAt: string | null;
  estimateRefreshing: boolean;
  progressLoading: boolean;
  refreshEstimate: () => Promise<void>;
}

/**
 * Loads My Progress snapshot for a membership and builds card-back skill scores.
 * Journal self-ratings (local) are used when present; otherwise scores come from
 * the same progress KPIs shown on My Progress (attendance, matches, goals, …).
 */
export function useClubPassSkills({
  clubId,
  membershipId,
  enabled = true,
  masterHints = null,
}: UseClubPassSkillsArgs): UseClubPassSkillsResult {
  const { t, language } = useLanguage();
  const [snapshot, setSnapshot] = useState<MemberProgressSnapshot | null>(null);
  const [estimateGeneratedAt, setEstimateGeneratedAt] = useState<string | null>(null);
  const [estimateRefreshing, setEstimateRefreshing] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [journalTick, setJournalTick] = useState(0);

  const locale = language === "de" ? "de" : "en";
  const canFetch = Boolean(enabled && clubId && membershipId);

  useEffect(() => {
    if (!canFetch || !clubId || !membershipId) {
      setSnapshot(null);
      setEstimateGeneratedAt(null);
      setProgressLoading(false);
      return;
    }
    let cancelled = false;
    setProgressLoading(true);
    void (async () => {
      const { data } = await fetchMemberProgressSnapshot(clubId, membershipId, "member");
      if (!cancelled) {
        setSnapshot(data);
        setEstimateGeneratedAt(new Date().toISOString());
        setProgressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFetch, clubId, membershipId]);

  const skillsSummary = useMemo((): ClubPassSkillsSummary | null => {
    if (!enabled) return null;

    // Real membership: wait for My Progress snapshot so scores are not empty defaults.
    if (canFetch) {
      if (!snapshot || !clubId || !membershipId) return null;
      const journal = loadTrainingJournal(clubId, membershipId);
      return buildClubPassSkillsSummary(snapshot, journal, locale, masterHints);
    }

    // Draft / preview without membership — still flippable, progress-derived from empty base + hints.
    if (!clubId) return null;
    return buildClubPassSkillsSummary(
      emptyMemberProgressSnapshot(`preview:${clubId}`, "member"),
      [],
      locale,
      masterHints,
    );
  }, [enabled, canFetch, snapshot, clubId, membershipId, locale, journalTick, masterHints]);

  const levelLabel = snapshot
    ? t.clubProgress.levels[snapshot.level] ?? snapshot.level
    : !canFetch && clubId
      ? t.clubProgress.levels.rookie ?? "rookie"
      : undefined;

  const refreshEstimate = useCallback(async () => {
    if (!clubId || !membershipId || estimateRefreshing) return;
    setEstimateRefreshing(true);
    try {
      const { data } = await fetchMemberProgressSnapshot(clubId, membershipId, "member");
      setSnapshot(data);
      setJournalTick((n) => n + 1);
      setEstimateGeneratedAt(new Date().toISOString());
    } finally {
      setEstimateRefreshing(false);
    }
  }, [clubId, membershipId, estimateRefreshing]);

  return {
    skillsSummary,
    levelLabel,
    xpValue: snapshot?.xp ?? (!canFetch && clubId ? 0 : undefined),
    estimateGeneratedAt,
    estimateRefreshing,
    progressLoading,
    refreshEstimate,
  };
}
