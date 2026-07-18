import { describe, expect, it } from "vitest";
import { emptyMemberProgressSnapshot } from "@/lib/club-member-progress";
import {
  averageJournalSelfRatings,
  buildClubPassSkillsSummary,
  computeClubPassSkillScores,
  estimateClubPassMarketValue,
} from "@/lib/club-member-pass-skills";

describe("club-member-pass-skills", () => {
  it("averages journal self-ratings", () => {
    const avg = averageJournalSelfRatings([
      {
        id: "1",
        createdAt: "2026-07-01T00:00:00.000Z",
        sessionDate: "2026-07-01",
        whatIDid: "a",
        improvements: "",
        selfRatings: { technique: 4, fitness: 3, tactics: 2, mindset: 5 },
      },
      {
        id: "2",
        createdAt: "2026-07-02T00:00:00.000Z",
        sessionDate: "2026-07-02",
        whatIDid: "b",
        improvements: "",
        selfRatings: { technique: 2, fitness: 5, tactics: 4, mindset: 3 },
      },
    ]);
    expect(avg).toEqual({ technique: 3, fitness: 4, tactics: 3, mindset: 4 });
  });

  it("builds FUT-style scores and market estimate from snapshot", () => {
    const snapshot = {
      ...emptyMemberProgressSnapshot("m1"),
      goals: 4,
      assists: 2,
      matches: 8,
      attended_trainings: 10,
      confirmed_trainings: 12,
      attendance_streak: 3,
      xp: 40,
      level: "regular" as const,
      level_index: 2,
      badge_count: 1,
    };
    const scores = computeClubPassSkillScores(snapshot, {
      technique: 4,
      fitness: 3,
      tactics: 4,
      mindset: 5,
    });
    expect(scores.overall).toBeGreaterThanOrEqual(40);
    expect(scores.overall).toBeLessThanOrEqual(99);
    expect(scores.technique).toBeGreaterThan(scores.fitness);

    const market = estimateClubPassMarketValue(snapshot, scores, 2, "de");
    expect(market.amountEur).toBeGreaterThanOrEqual(5000);
    expect(market.label).toContain("€");
    expect(market.confidence).toBe("medium");
  });

  it("derives skill scores from My Progress KPIs when journal is empty", () => {
    const empty = emptyMemberProgressSnapshot("m1");
    const emptyScores = computeClubPassSkillScores(empty, null);

    const active = {
      ...empty,
      goals: 6,
      assists: 4,
      matches: 12,
      attended_trainings: 18,
      confirmed_trainings: 20,
      attendance_streak: 5,
      attendance_best_streak: 8,
      xp: 90,
      level: "core" as const,
      level_index: 3,
      badge_count: 3,
    };
    const activeScores = computeClubPassSkillScores(active, null);

    expect(activeScores.technique).toBeGreaterThan(emptyScores.technique);
    expect(activeScores.fitness).toBeGreaterThan(emptyScores.fitness);
    expect(activeScores.tactics).toBeGreaterThan(emptyScores.tactics);
    expect(activeScores.mindset).toBeGreaterThan(emptyScores.mindset);
    expect(activeScores.attendance).toBeGreaterThan(emptyScores.attendance);
    expect(activeScores.competition).toBeGreaterThan(emptyScores.competition);
    expect(activeScores.overall).toBeGreaterThan(emptyScores.overall);
  });

  it("uses master goals hint only when My Progress already has recordings", () => {
    const empty = emptyMemberProgressSnapshot("m1");
    const emptySummary = buildClubPassSkillsSummary(empty, [], "en", { goalsCount: 8 });
    expect(emptySummary?.hasRecording).toBe(false);
    expect(emptySummary?.market.label).toBe("—");

    const withProgress = {
      ...empty,
      matches: 2,
      attended_trainings: 3,
    };
    const summary = buildClubPassSkillsSummary(withProgress, [], "en", { goalsCount: 8 });
    expect(summary).not.toBeNull();
    expect(summary!.hasRecording).toBe(true);
    expect(summary!.scores.technique).toBeGreaterThan(
      computeClubPassSkillScores(withProgress, null).technique,
    );
  });

  it("marks empty progress as no recording", () => {
    const summary = buildClubPassSkillsSummary(emptyMemberProgressSnapshot("m1"), [], "en");
    expect(summary?.hasRecording).toBe(false);
    expect(summary?.market.label).toBe("—");
  });

  it("returns null summary without snapshot", () => {
    expect(buildClubPassSkillsSummary(null, [], "en")).toBeNull();
  });
});
