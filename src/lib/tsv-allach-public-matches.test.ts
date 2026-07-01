import { describe, expect, it } from "vitest";
import {
  getTsvAllachShowcaseMatches,
  mergePublicClubMatchesUpcoming,
  resolveShowcaseTeamId,
} from "@/lib/tsv-allach-public-matches";

describe("tsv-allach-public-matches", () => {
  const teams = [
    { id: "team-u12i", name: "U12-I" },
    { id: "team-u12ii", name: "U12-II" },
    { id: "team-herren", name: "Erste Herren" },
  ];

  it("resolves U12-1 label to U12-I team", () => {
    expect(resolveShowcaseTeamId(teams, "U12-1")).toBe("team-u12i");
  });

  it("includes Sommerfest U12-1 fixture with team_id", () => {
    const matches = getTsvAllachShowcaseMatches(teams);
    const u12 = matches.find((m) => m.id === "tsv-showcase-match-m20");
    expect(u12?.team_id).toBe("team-u12i");
    expect(u12?.opponent).toContain("U13-1");
  });

  it("merges showcase matches for TSV Allach only", () => {
    const club = { slug: "tsv-allach-09", name: "TSV Allach 09" };
    const merged = mergePublicClubMatchesUpcoming(club, [], teams);
    expect(merged.length).toBeGreaterThan(20);
    expect(mergePublicClubMatchesUpcoming({ slug: "other", name: "Other" }, [], teams)).toEqual([]);
  });

  it("uses persisted db Sommerfest rows (incl. opponent logo) instead of showcase placeholders", () => {
    const club = { slug: "tsv-allach-09", name: "TSV Allach 09" };
    const dbRow = {
      id: "db-match-m01",
      opponent: "Eltern (U07-III)",
      is_home: true,
      match_date: "2026-07-11T09:00:00.000Z",
      location: "Platz 1 · Sportanlage",
      status: "scheduled",
      home_score: null,
      away_score: null,
      team_id: "team-u12i",
      notes: "tsv-sommerfest-2026:m01",
      publish_to_public_schedule: true,
      opponent_logo_url: "https://cdn.example/opponent.png",
      public_match_detail_enabled: true,
      competitions: { name: "Sommerfest 2026" },
    };
    const merged = mergePublicClubMatchesUpcoming(club, [dbRow], teams);
    const m01 = merged.find((m) => m.notes === "tsv-sommerfest-2026:m01" || m.id === "db-match-m01");
    expect(m01?.id).toBe("db-match-m01");
    expect(m01?.opponent_logo_url).toBe("https://cdn.example/opponent.png");
    expect(merged.filter((m) => m.id === "tsv-showcase-match-m01")).toHaveLength(0);
  });

  it("links Sommerfest showcase rows to db rows by fixture when notes are missing", () => {
    const extendedTeams = [
      ...teams,
      { id: "team-u07iii", name: "U07-III" },
    ];
    const dbRow = {
      id: "db-match-u07",
      opponent: "Eltern (U07-III)",
      is_home: true,
      match_date: "2026-07-11T11:00:00+02:00",
      location: "Platz 1",
      status: "scheduled",
      home_score: null,
      away_score: null,
      team_id: "team-u07iii",
      notes: null,
      publish_to_public_schedule: true,
      opponent_logo_url: "https://cdn.example/parents.png",
      public_match_detail_enabled: true,
      competitions: { name: "Sommerfest 2026" },
    };
    const showcase = getTsvAllachShowcaseMatches(extendedTeams, [dbRow]);
    const u07 = showcase.find((m) => m.id === "db-match-u07");
    expect(u07?.opponent_logo_url).toBe("https://cdn.example/parents.png");
  });
});
