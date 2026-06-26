import { describe, expect, it } from "vitest";
import { getFriendlyMatchPeerTeams, parseYouthTeamLabel } from "@/lib/public-club-friendly-teams";

describe("parseYouthTeamLabel", () => {
  it("parses numeric and roman suffixes", () => {
    expect(parseYouthTeamLabel("U12-1")).toEqual({ age: 12, tier: 1 });
    expect(parseYouthTeamLabel("U12-I")).toEqual({ age: 12, tier: 1 });
    expect(parseYouthTeamLabel("U12-II")).toEqual({ age: 12, tier: 2 });
    expect(parseYouthTeamLabel("U12-3")).toEqual({ age: 12, tier: 3 });
  });

  it("returns null for non-youth labels", () => {
    expect(parseYouthTeamLabel("Erste Herren")).toBeNull();
    expect(parseYouthTeamLabel("U12")).toBeNull();
  });
});

describe("getFriendlyMatchPeerTeams", () => {
  const teams = [
    { id: "u11-1", name: "U11-I" },
    { id: "u12-1", name: "U12-I" },
    { id: "u12-2", name: "U12-II" },
    { id: "u12-3", name: "U12-III" },
    { id: "u13-1", name: "U13-I" },
    { id: "u13-2", name: "U13-II" },
    { id: "herren", name: "Erste Herren" },
  ];

  it("returns cross-year peers and all same-year tiers for U12 top team", () => {
    expect(getFriendlyMatchPeerTeams(teams, "u12-1").map((t) => t.name)).toEqual([
      "U11-I",
      "U12-I",
      "U12-II",
      "U12-III",
      "U13-I",
    ]);
  });

  it("uses comparable tier for adjacent years when medium team is selected", () => {
    expect(getFriendlyMatchPeerTeams(teams, "u12-2").map((t) => t.name)).toEqual([
      "U12-I",
      "U12-II",
      "U12-III",
      "U13-II",
    ]);
  });

  it("falls back to selected team only for non-youth teams", () => {
    expect(getFriendlyMatchPeerTeams(teams, "herren")).toEqual([{ id: "herren", name: "Erste Herren" }]);
  });
});
