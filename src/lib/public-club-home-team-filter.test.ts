import { describe, expect, it } from "vitest";
import { filterPublicClubRowsByTeamId } from "@/lib/public-club-home-team-filter";

describe("filterPublicClubRowsByTeamId", () => {
  const rows = [
    { id: "1", team_id: "a" },
    { id: "2", team_id: "b" },
    { id: "3", team_id: null },
  ];

  it("returns all rows when team id is empty", () => {
    expect(filterPublicClubRowsByTeamId(rows, null)).toHaveLength(3);
    expect(filterPublicClubRowsByTeamId(rows, "")).toHaveLength(3);
  });

  it("filters rows by team id", () => {
    expect(filterPublicClubRowsByTeamId(rows, "a").map((r) => r.id)).toEqual(["1"]);
  });
});
