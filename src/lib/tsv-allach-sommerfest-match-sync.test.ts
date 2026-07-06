import { describe, expect, it } from "vitest";
import {
  extractSommerfestMatchIdFromNotes,
  sommerfestDatetimeLocalToIso,
  sommerfestEffectiveKickoffTime,
  sommerfestIsoToDatetimeLocal,
  sommerfestMatchDateIso,
  sommerfestMatchImportKey,
  sommerfestMatchToInsertRow,
  sommerfestTemplateToDashboardMatch,
} from "@/lib/tsv-allach-sommerfest-match-sync";
import { SOMMERFEST_MATCHES } from "@/lib/tsv-allach-sommerfest-2026";

describe("tsv-allach-sommerfest-match-sync", () => {
  const teams = [{ id: "u12i", name: "U12-I" }];

  it("builds stable import keys", () => {
    expect(sommerfestMatchImportKey("m20")).toBe("tsv-sommerfest-2026:m20");
    expect(extractSommerfestMatchIdFromNotes("tsv-sommerfest-2026:m20")).toBe("m20");
  });

  it("maps U12-1 template to U12-I team", () => {
    const template = SOMMERFEST_MATCHES.find((match) => match.id === "m20");
    expect(template).toBeTruthy();
    const row = sommerfestMatchToInsertRow("club-1", template!, teams);
    expect(row.team_id).toBe("u12i");
    expect(row.opponent).toContain("U13");
  });

  it("preserves opponent_logo_url from persisted db rows", () => {
    const template = SOMMERFEST_MATCHES[0];
    const mapped = sommerfestTemplateToDashboardMatch(template, teams, {
      id: "match-1",
      opponent: "Eltern (U7-3)",
      is_home: true,
      match_date: "2026-07-11T09:00:00.000Z",
      location: "Platz 1",
      status: "scheduled",
      home_score: null,
      away_score: null,
      competition_id: null,
      team_id: "u12i",
      notes: sommerfestMatchImportKey(template.id),
      opponent_logo_url: "https://cdn.example/opponent.png",
    });
    expect(mapped.opponent_logo_url).toBe("https://cdn.example/opponent.png");
  });

  it("round-trips Berlin datetime-local values for persisted kickoffs", () => {
    const iso = sommerfestMatchDateIso("11:00");
    expect(iso).toBe("2026-07-11T09:00:00.000Z");
    expect(sommerfestIsoToDatetimeLocal(iso)).toBe("2026-07-11T11:00");
    expect(sommerfestDatetimeLocalToIso("2026-07-11T11:00")).toBe(iso);
  });

  it("uses persisted kickoff time over template default in schedule labels", () => {
    const template = SOMMERFEST_MATCHES.find((match) => match.id === "m01");
    expect(template?.time).toBe("11:00");
    expect(
      sommerfestEffectiveKickoffTime(template!, { match_date: "2026-07-11T08:30:00.000Z" }),
    ).toBe("10:30");
  });
});
