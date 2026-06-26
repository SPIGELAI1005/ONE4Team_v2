import { describe, expect, it } from "vitest";
import {
  findTsvAllachShowcaseNewsById,
  getTsvAllachShowcaseNews,
  isTsvAllachShowcaseNewsId,
  mergePublicClubNews,
} from "@/lib/tsv-allach-public-news";

describe("tsv-allach-public-news", () => {
  it("builds showcase posts for TSV Allach", () => {
    const de = getTsvAllachShowcaseNews("de");
    expect(de.length).toBeGreaterThanOrEqual(4);
    expect(de.some((n) => n.title.includes("Hitzewarnung"))).toBe(true);
    expect(de.some((n) => n.title.includes("Sommerfest"))).toBe(true);
    expect(de.some((n) => n.title.includes("Fussball Camp"))).toBe(true);
  });

  it("resolves showcase article by id", () => {
    const id = "tsv-showcase-feed-news-heat";
    expect(isTsvAllachShowcaseNewsId(id)).toBe(true);
    const article = findTsvAllachShowcaseNewsById(id, "de");
    expect(article?.title).toContain("Training entfällt");
    expect(article?.image_url).toContain("tsv-allach-training-cancelled-heat-2026");
  });

  it("merges showcase with DB rows for TSV Allach only", () => {
    const club = { slug: "tsv-allach-09", name: "TSV Allach 09" };
    const db = [
      {
        id: "db-1",
        title: "Club update",
        content: "Body",
        created_at: "2026-05-01T00:00:00Z",
        priority: "normal",
        publish_to_public_website: true,
      },
    ];
    const merged = mergePublicClubNews(club, db, "de");
    expect(merged.length).toBe(db.length + getTsvAllachShowcaseNews("de").length);
    expect(mergePublicClubNews({ slug: "other", name: "Other FC" }, db, "de")).toEqual(db);
  });
});
