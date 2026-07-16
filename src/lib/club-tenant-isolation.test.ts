import { describe, expect, it } from "vitest";
import { getDefaultHeroAssetPublicPath } from "@/lib/club-hero-default-assets";
import { mergePublicClubEvents } from "@/lib/tsv-allach-public-events";
import { mergePublicClubNews } from "@/lib/tsv-allach-public-news";
import { mergePublicClubMatchesUpcoming } from "@/lib/tsv-allach-public-matches";
import { applyTsvAllachClubContactDefaults } from "@/lib/tsv-allach-club-contact";

const OTHER_CLUB = { slug: "fc-example-united", name: "FC Example United" };
const TSV_CLUB = { slug: "tsv-allach-09", name: "TSV Allach 09" };

describe("club tenant isolation guardrails", () => {
  it("uses only neutral hero defaults for clubs without uploaded hero/cover", () => {
    const path = getDefaultHeroAssetPublicPath("football-training-pitch-neutral");
    expect(path).toMatch(/^\/assets\/club-hero-defaults\//);
    expect(path).not.toMatch(/\/images\/camps\//);
    expect(path).not.toMatch(/sommer-fussball-camp/i);
  });

  it("does not inject TSV showcase events into other clubs", () => {
    expect(mergePublicClubEvents(OTHER_CLUB, [], "en")).toEqual([]);
    expect(mergePublicClubEvents(TSV_CLUB, [], "en").length).toBeGreaterThan(0);
  });

  it("does not inject TSV showcase news into other clubs", () => {
    expect(mergePublicClubNews(OTHER_CLUB, [], "en")).toEqual([]);
    expect(mergePublicClubNews(TSV_CLUB, [], "en").length).toBeGreaterThan(0);
  });

  it("does not inject TSV showcase matches into other clubs", () => {
    expect(mergePublicClubMatchesUpcoming(OTHER_CLUB, [], [])).toEqual([]);
    expect(mergePublicClubMatchesUpcoming(TSV_CLUB, [], []).length).toBeGreaterThan(0);
  });

  it("does not apply TSV contact defaults to other clubs", () => {
    const other = applyTsvAllachClubContactDefaults({
      ...OTHER_CLUB,
      email: "info@example.com",
      phone: "+49 123",
      address: "Example Street 1",
    });
    expect(other.email).toBe("info@example.com");
    expect(other.phone).toBe("+49 123");
    expect(other.address).toBe("Example Street 1");
  });
});
