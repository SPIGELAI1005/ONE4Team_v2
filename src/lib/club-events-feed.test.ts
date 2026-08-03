import { describe, expect, it } from "vitest";
import {
  defaultSommerfestEventsFeed,
  normalizeClubEventsFeed,
  pickSavedEventsFeed,
  resolveEffectiveEventsFeed,
} from "@/lib/club-events-feed";

describe("club-events-feed", () => {
  it("normalizes saved feed items", () => {
    const feed = normalizeClubEventsFeed({
      enabled: true,
      festivalDate: "2026-07-11",
      dayProgram: "Tagsüber ab 11:00",
      items: [
        {
          id: "news-1",
          kind: "news",
          date: "2026-08-01",
          time: "08:30",
          titleDe: "Training entfällt",
          titleEn: "Training cancelled",
          accent: "rose",
        },
      ],
    });
    expect(feed.items).toHaveLength(1);
    expect(feed.festivalDate).toBe("2026-07-11");
  });

  it("falls back to Sommerfest defaults for TSV Allach", () => {
    const feed = resolveEffectiveEventsFeed(null, { slug: "tsv-allach-09", name: "TSV Allach 09" });
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.festivalDate).toBe(defaultSommerfestEventsFeed().festivalDate);
  });

  it("prefers draft feed over published snapshot", () => {
    const draft = normalizeClubEventsFeed({
      enabled: true,
      festivalDate: "2026-07-11",
      dayProgram: "Draft label",
      items: [
        {
          id: "news-draft",
          kind: "news",
          date: "2026-08-01",
          time: "09:00",
          titleDe: "Draft news",
          titleEn: "Draft news",
          accent: "rose",
        },
      ],
    });
    const published = defaultSommerfestEventsFeed();
    const picked = pickSavedEventsFeed(draft, published);
    expect(picked?.dayProgram).toBe("Draft label");
    expect(picked?.items[0]?.id).toBe("news-draft");
  });
});
