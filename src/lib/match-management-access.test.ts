import { describe, expect, it } from "vitest";
import {
  canCreateMatches,
  canManageMatchForTeam,
  canManageSommerfestSchedule,
  type MatchManagementAccessInput,
} from "@/lib/match-management-access";

const base: MatchManagementAccessInput = {
  legacyRole: "player",
  assignments: [],
  isAdmin: false,
  hasMatchesWrite: true,
  coachedTeamIds: [],
};

describe("match-management-access", () => {
  it("allows club admins to manage any match", () => {
    const input = { ...base, isAdmin: true };
    expect(canManageMatchForTeam(input, "team-a")).toBe(true);
    expect(canCreateMatches(input)).toBe(true);
  });

  it("allows coached trainers only for assigned teams", () => {
    const input = { ...base, coachedTeamIds: ["team-u12"] };
    expect(canManageMatchForTeam(input, "team-u12")).toBe(true);
    expect(canManageMatchForTeam(input, "team-u13")).toBe(false);
    expect(canCreateMatches(input)).toBe(true);
  });

  it("allows any match-capable trainer to edit the full Sommerfest schedule", () => {
    const input = { ...base, coachedTeamIds: ["team-u12"] };
    expect(canManageSommerfestSchedule(input)).toBe(true);
  });
});
