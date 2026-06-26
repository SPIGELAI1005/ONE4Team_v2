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
});
