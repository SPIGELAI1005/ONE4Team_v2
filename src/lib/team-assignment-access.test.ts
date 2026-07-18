import { describe, expect, it } from "vitest";
import { resolveTeamAssignmentAccess } from "@/lib/team-assignment-access";

describe("resolveTeamAssignmentAccess", () => {
  it("gives club admins full assignment rights", () => {
    expect(resolveTeamAssignmentAccess("club_admin")).toEqual({
      canManageTeams: true,
      canAssignPlayers: true,
      canAssignCoaches: true,
    });
    expect(resolveTeamAssignmentAccess("admin").canAssignCoaches).toBe(true);
  });

  it("lets trainers assign players but not coaches", () => {
    expect(resolveTeamAssignmentAccess("trainer")).toEqual({
      canManageTeams: true,
      canAssignPlayers: true,
      canAssignCoaches: false,
    });
  });

  it("blocks players and other personas from managing or assigning", () => {
    for (const role of ["player", "member", "parent", "staff", null] as const) {
      expect(resolveTeamAssignmentAccess(role)).toEqual({
        canManageTeams: false,
        canAssignPlayers: false,
        canAssignCoaches: false,
      });
    }
  });
});
