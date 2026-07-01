import { describe, expect, it } from "vitest";
import {
  buildPublicMatchOpponentLogoLookup,
  publicMatchClubTeamName,
  publicMatchFixtureSides,
  publicMatchHeadline,
  publicMatchOpponentName,
  publicMatchSideLogos,
} from "@/lib/public-club-match-display";

const teams = [
  { id: "t1", name: "U07-III" },
  { id: "t2", name: "U12-I" },
];

describe("publicMatchFixtureSides", () => {
  it("uses team name instead of club name on the club side", () => {
    const sides = publicMatchFixtureSides(
      {
        is_home: true,
        opponent: "Eltern (U07-III)",
        team_id: "t1",
        teams: { name: "U07-III" },
      },
      teams,
      "TSV Allach 09",
    );
    expect(sides.homeName).toBe("U07-III");
    expect(sides.awayName).toBe("Eltern (U07-III)");
    expect(publicMatchHeadline(
      { is_home: true, opponent: "Eltern (U07-III)", team_id: "t1", teams: { name: "U07-III" } },
      teams,
      "TSV Allach 09",
    )).toBe("U07-III vs Eltern (U07-III)");
  });

  it("falls back to club name when no team is linked", () => {
    expect(publicMatchClubTeamName({ team_id: null, teams: null }, teams, "TSV Allach 09")).toBe("TSV Allach 09");
  });

  it("resolves youth opponent labels to canonical team names", () => {
    expect(publicMatchOpponentName({ opponent: "U12-1" }, teams)).toBe("U12-I");
  });
});

describe("publicMatchOpponentLogoLookup", () => {
  it("reuses opponent logo across Eltern spelling variants", () => {
    const lookup = buildPublicMatchOpponentLogoLookup(
      [
        {
          id: "m1",
          opponent: "Eltern (U07-III)",
          is_home: true,
          match_date: "2026-07-11T09:00:00.000Z",
          opponent_logo_url: "https://cdn.example/eltern.png",
        },
      ],
      teams,
    );
    const sides = publicMatchSideLogos(
      {
        id: "m2",
        opponent: "Eltern (U7-3)",
        is_home: true,
        match_date: "2026-07-11T10:00:00.000Z",
        opponent_logo_url: null,
      },
      teams,
      "https://cdn.example/club.png",
      lookup,
    );
    expect(sides.awayLogo).toBe("https://cdn.example/eltern.png");
  });

  it("falls back to initials when opponent logo equals club logo", () => {
    const clubLogo = "https://cdn.example/club.png";
    const sides = publicMatchSideLogos(
      {
        id: "m1",
        opponent: "Eltern (U07-III)",
        is_home: true,
        match_date: "2026-07-11T09:00:00.000Z",
        opponent_logo_url: clubLogo,
      },
      teams,
      clubLogo,
      new Map(),
    );
    expect(sides.awayLogo).toBeNull();
  });
});
