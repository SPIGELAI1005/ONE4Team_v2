import { describe, expect, it } from "vitest";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { SOMMERFEST_MATCHES, sommerfestMatchesByCategory } from "@/lib/tsv-allach-sommerfest-2026";

describe("tsv-allach-sommerfest-2026", () => {
  it("detects TSV Allach club by slug or name", () => {
    expect(isTsvAllachClub({ slug: "tsv-allach-09", name: "TSV Allach 09" })).toBe(true);
    expect(isTsvAllachClub({ slug: "other-club", name: "Other FC" })).toBe(false);
  });

  it("includes full Sommerfest match plan from PDF", () => {
    expect(SOMMERFEST_MATCHES).toHaveLength(22);
    expect(sommerfestMatchesByCategory("herren")).toHaveLength(2);
    expect(sommerfestMatchesByCategory("kleinfeld")).toHaveLength(16);
  });
});
