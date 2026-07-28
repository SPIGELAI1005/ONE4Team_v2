import { describe, expect, it } from "vitest";
import {
  isCoachMembershipRole,
  membershipDisplayTeamLabel,
  reconcileMemberTeamEditState,
  resolveClubTeamIdFromLabel,
} from "@/lib/member-team-assignments";

const clubTeams = [
  { id: "t-gv", name: "GesamtVerein", age_group: null },
  { id: "t-u16", name: "U16", age_group: "U16" },
];

describe("isCoachMembershipRole", () => {
  it("treats club ops roles as coaches", () => {
    expect(isCoachMembershipRole("team_management")).toBe(true);
    expect(isCoachMembershipRole("staff")).toBe(true);
    expect(isCoachMembershipRole("admin")).toBe(true);
    expect(isCoachMembershipRole("trainer")).toBe(true);
    expect(isCoachMembershipRole("player")).toBe(false);
    expect(isCoachMembershipRole("member")).toBe(false);
  });
});

describe("membershipDisplayTeamLabel", () => {
  it("prefers assigned roster teams", () => {
    expect(
      membershipDisplayTeamLabel({
        assignedTeamNames: ["U16", "U19"],
        membershipTeam: "Herren",
        ageGroup: "GesamtVerein",
      }),
    ).toBe("U16, U19");
  });

  it("heals GesamtVerein typed into age_group while team stayed Herren", () => {
    expect(
      membershipDisplayTeamLabel({
        assignedTeamNames: [],
        membershipTeam: "Herren",
        ageGroup: "GesamtVerein",
      }),
    ).toBe("GesamtVerein");
  });

  it("heals Jugend + free-text GesamtVerein even when GesamtVerein is not a club team row", () => {
    expect(
      membershipDisplayTeamLabel({
        assignedTeamNames: [],
        membershipTeam: "Jugend",
        ageGroup: "GesamtVerein",
      }),
    ).toBe("GesamtVerein");
  });

  it("keeps real age groups when membership team is set", () => {
    expect(
      membershipDisplayTeamLabel({
        assignedTeamNames: [],
        membershipTeam: "Herren",
        ageGroup: "U16",
      }),
    ).toBe("Herren");
  });
});

describe("reconcileMemberTeamEditState", () => {
  it("preselects chips when membership.team matches a club team", () => {
    expect(
      reconcileMemberTeamEditState({
        clubTeams,
        playerTeamIds: [],
        coachTeamIds: [],
        membershipTeam: "GesamtVerein",
        ageGroup: "",
      }),
    ).toEqual({
      teamIds: ["t-gv"],
      team: "GesamtVerein",
      ageGroup: "",
    });
  });

  it("moves misfiled GesamtVerein from age_group into team and clears age_group", () => {
    expect(
      reconcileMemberTeamEditState({
        clubTeams,
        playerTeamIds: [],
        coachTeamIds: [],
        membershipTeam: "Herren",
        ageGroup: "GesamtVerein",
      }),
    ).toEqual({
      teamIds: ["t-gv"],
      team: "GesamtVerein",
      ageGroup: "",
    });
  });

  it("keeps free-text GesamtVerein when it is not a club team row", () => {
    expect(
      reconcileMemberTeamEditState({
        clubTeams: [],
        playerTeamIds: [],
        coachTeamIds: [],
        membershipTeam: "Herren",
        ageGroup: "GesamtVerein",
      }),
    ).toEqual({
      teamIds: [],
      team: "GesamtVerein",
      ageGroup: "",
    });
  });
});

describe("resolveClubTeamIdFromLabel", () => {
  it("resolves case-insensitively", () => {
    expect(resolveClubTeamIdFromLabel(clubTeams, "gesamtverein")).toBe("t-gv");
  });
});
