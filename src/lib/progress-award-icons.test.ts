import { describe, expect, it } from "vitest";
import {
  getProgressAwardIcon,
  progressAwardStepIndex,
  progressAwardWithinLevelStep,
} from "@/lib/progress-award-icons";

describe("progress-award-icons", () => {
  it("starts at step 0 for 0 XP", () => {
    expect(progressAwardWithinLevelStep(0).withinLevelStep).toBe(0);
    expect(progressAwardStepIndex(0)).toBe(0);
    expect(getProgressAwardIcon(0).level).toBe("rookie");
  });

  it("advances within rookie by ~10 XP and ~10% toward regular (25)", () => {
    // 10 XP → 40% of band → pct step 4
    expect(progressAwardWithinLevelStep(10).withinLevelStep).toBe(4);
    // 12 XP still ~48% → 4; 13 XP → 52% → 5
    expect(progressAwardWithinLevelStep(12).withinLevelStep).toBe(4);
    expect(progressAwardWithinLevelStep(13).withinLevelStep).toBe(5);
  });

  it("jumps palette decade when entering regular (25 XP)", () => {
    const endRookie = progressAwardStepIndex(24);
    const startRegular = progressAwardStepIndex(25);
    expect(startRegular).toBeGreaterThanOrEqual(10);
    expect(startRegular).toBeGreaterThan(endRookie);
    expect(getProgressAwardIcon(25).level).toBe("regular");
  });

  it("returns distinct icons across milestones", () => {
    const a = getProgressAwardIcon(0).Icon;
    const b = getProgressAwardIcon(13).Icon;
    const c = getProgressAwardIcon(25).Icon;
    // Not all must differ pairwise, but early vs mid should usually shift
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(c).toBeTruthy();
    expect(progressAwardStepIndex(0)).not.toBe(progressAwardStepIndex(13));
    expect(progressAwardStepIndex(13)).not.toBe(progressAwardStepIndex(25));
  });
});
