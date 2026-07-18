import { describe, expect, it } from "vitest";
import {
  computeMatchStandings,
  filterCompetitionsByType,
} from "@/lib/match-standings";

describe("computeMatchStandings", () => {
  it("computes W-D-L from completed matches for our side", () => {
    const rows = computeMatchStandings([
      {
        team_id: "t1",
        teams: { name: "U15" },
        status: "completed",
        is_home: true,
        home_score: 2,
        away_score: 1,
        competition_id: "c1",
      },
      {
        team_id: "t1",
        teams: { name: "U15" },
        status: "completed",
        is_home: false,
        home_score: 3,
        away_score: 3,
        competition_id: "c1",
      },
      {
        team_id: "t1",
        teams: { name: "U15" },
        status: "scheduled",
        is_home: true,
        home_score: null,
        away_score: null,
        competition_id: "c1",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ team: "U15", p: 2, w: 1, d: 1, l: 0, gf: 5, ga: 4, gd: 1, pts: 4 });
  });

  it("filters by competitionId when provided", () => {
    const rows = computeMatchStandings(
      [
        {
          team_id: "t1",
          teams: { name: "A" },
          status: "completed",
          is_home: true,
          home_score: 1,
          away_score: 0,
          competition_id: "tour-a",
        },
        {
          team_id: "t1",
          teams: { name: "A" },
          status: "completed",
          is_home: true,
          home_score: 5,
          away_score: 0,
          competition_id: "tour-b",
        },
      ],
      { competitionId: "tour-a" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].gf).toBe(1);
    expect(rows[0].pts).toBe(3);
  });

  it("groups null team_id under club label", () => {
    const rows = computeMatchStandings(
      [
        {
          team_id: null,
          teams: null,
          status: "completed",
          is_home: true,
          home_score: 0,
          away_score: 1,
          competition_id: null,
        },
      ],
      { clubLabel: "Club XI" },
    );
    expect(rows[0].team).toBe("Club XI");
    expect(rows[0].l).toBe(1);
    expect(rows[0].pts).toBe(0);
  });
});

describe("filterCompetitionsByType", () => {
  const comps = [
    { id: "1", competition_type: "league" },
    { id: "2", competition_type: "tournament" },
    { id: "3", competition_type: "cup" },
  ];

  it("returns all when filter is all", () => {
    expect(filterCompetitionsByType(comps, "all")).toHaveLength(3);
  });

  it("filters tournament type", () => {
    expect(filterCompetitionsByType(comps, "tournament").map((c) => c.id)).toEqual(["2"]);
  });
});
