import { describe, expect, it } from "vitest";
import {
  canOptInPublicBadges,
  computeProgressXp,
  levelFromXp,
  nextBadgeHint,
  parseMemberProgressSnapshot,
  type MemberProgressSnapshot,
} from "@/lib/club-member-progress";

function baseSnapshot(overrides: Partial<MemberProgressSnapshot> = {}): MemberProgressSnapshot {
  return {
    membership_id: "m1",
    goals: 0,
    assists: 0,
    matches: 0,
    attended_trainings: 0,
    confirmed_trainings: 0,
    attendance_streak: 0,
    attendance_best_streak: 0,
    badges: [],
    xp: 0,
    level: "rookie",
    level_index: 1,
    level_xp_floor: 0,
    next_level_xp: 25,
    badge_count: 0,
    public_badges_opt_in: false,
    role: "member",
    ...overrides,
  };
}

describe("club-member-progress", () => {
  it("computes XP from attendance, RSVP, matches, and badges", () => {
    expect(
      computeProgressXp({
        attendedTrainings: 4,
        confirmedTrainings: 3,
        matches: 2,
        badgeCount: 1,
      }),
    ).toBe(4 * 2 + 3 + 2 * 3 + 5);
  });

  it("maps XP to levels and progress within the band", () => {
    expect(levelFromXp(0).level).toBe("rookie");
    expect(levelFromXp(25).level).toBe("regular");
    expect(levelFromXp(75).level).toBe("core");
    expect(levelFromXp(150).level).toBe("leader");
    expect(levelFromXp(300).level).toBe("legend");
    expect(levelFromXp(300).progress01).toBe(1);

    const mid = levelFromXp(50);
    expect(mid.level).toBe("regular");
    expect(mid.floor).toBe(25);
    expect(mid.next).toBe(75);
    expect(mid.progress01).toBeCloseTo(0.5, 5);
  });

  it("suggests the nearest unearned badge threshold", () => {
    const hint = nextBadgeHint(
      baseSnapshot({
        goals: 3,
        attendance_streak: 4,
        badges: [{ badge_type: "goals_5", badge_name: "Sharp Shooter" }],
      }),
    );
    expect(hint?.badgeType).toBe("attendance_streak_5");
    expect(hint?.remaining).toBe(1);
  });

  it("parses progress snapshot JSON safely", () => {
    const parsed = parseMemberProgressSnapshot({
      membership_id: "abc",
      goals: "2",
      assists: 1,
      matches: 4,
      attended_trainings: 6,
      confirmed_trainings: 5,
      attendance_streak: 3,
      attendance_best_streak: 7,
      badges: [{ badge_type: "matches_10", badge_name: "Squad Regular" }],
      xp: 40,
      level: "regular",
      level_index: 2,
      level_xp_floor: 25,
      next_level_xp: 75,
      badge_count: 1,
      public_badges_opt_in: true,
      role: "trainer",
    });
    expect(parsed?.membership_id).toBe("abc");
    expect(parsed?.goals).toBe(2);
    expect(parsed?.badges).toHaveLength(1);
    expect(parsed?.public_badges_opt_in).toBe(true);
    expect(parseMemberProgressSnapshot(null)).toBeNull();
    expect(parseMemberProgressSnapshot([])).toBeNull();
  });

  it("allows public badge opt-in for adult roles only", () => {
    expect(canOptInPublicBadges("member")).toBe(true);
    expect(canOptInPublicBadges("trainer")).toBe(true);
    expect(canOptInPublicBadges("club_admin")).toBe(true);
    expect(canOptInPublicBadges("player")).toBe(false);
    expect(canOptInPublicBadges(null)).toBe(false);
  });
});
