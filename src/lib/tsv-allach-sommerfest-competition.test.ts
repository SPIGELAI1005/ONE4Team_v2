import { describe, expect, it } from "vitest";
import { SOMMERFEST_MATCHES } from "@/lib/tsv-allach-sommerfest-2026";
import {
  buildSommerfestTournamentSlots,
  isSommerfestCompetitionMatch,
  publicTournamentPath,
  SOMMERFEST_COMPETITION_NAME,
  SOMMERFEST_TOURNAMENT_SLUG,
} from "@/lib/tsv-allach-sommerfest-competition";

describe("tsv-allach-sommerfest-competition", () => {
  it("builds one slot per PDF fixture", () => {
    const slots = buildSommerfestTournamentSlots([]);
    expect(slots).toHaveLength(SOMMERFEST_MATCHES.length);
    expect(slots.every((slot) => slot.match === null)).toBe(true);
  });

  it("maps db rows to template ids via notes key", () => {
    const slots = buildSommerfestTournamentSlots([
      {
        id: "db-1",
        opponent: "U12-II",
        is_home: true,
        match_date: "2026-07-11T09:00:00.000Z",
        location: "Kleinfeld 1",
        status: "scheduled",
        home_score: null,
        away_score: null,
        competition_id: "cup-1",
        team_id: "team-1",
        notes: "tsv-sommerfest-2026:m01",
      },
    ]);
    const first = slots.find((slot) => slot.template.id === "m01");
    expect(first?.match?.id).toBe("db-1");
  });

  it("detects sommerfest competition matches", () => {
    expect(isSommerfestCompetitionMatch({ competitions: { name: SOMMERFEST_COMPETITION_NAME } })).toBe(true);
    expect(isSommerfestCompetitionMatch({ notes: "tsv-sommerfest-2026:m02" })).toBe(true);
    expect(isSommerfestCompetitionMatch({ competitions: { name: "Bundesliga" } })).toBe(false);
  });

  it("builds public tournament path", () => {
    expect(publicTournamentPath("/club/tsv-allach-09", "?lang=de")).toBe(
      `/club/tsv-allach-09/tournament/${SOMMERFEST_TOURNAMENT_SLUG}?lang=de`,
    );
  });
});
