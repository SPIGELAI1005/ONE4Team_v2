import { describe, expect, it } from "vitest";
import {
  extractSommerfestMatchIdFromNotes,
  sommerfestMatchImportKey,
  sommerfestMatchToInsertRow,
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
});
