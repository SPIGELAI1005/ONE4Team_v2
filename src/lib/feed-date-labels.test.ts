import { describe, expect, it } from "vitest";
import {
  formatFeedDayHeading,
  formatFeedSchedulePrimary,
  formatFeedValidUntilLine,
  groupItemsByIsoDate,
} from "@/lib/feed-date-labels";
import { sommerfestFeedSorted } from "@/lib/tsv-allach-sommerfest-2026";

describe("feed-date-labels", () => {
  const labels = {
    today: "Heute",
    tomorrow: "Morgen",
    yesterday: "Gestern",
    validUntil: "Gültig bis",
  };

  it("groups items by iso date newest first", () => {
    const grouped = groupItemsByIsoDate([
      { date: "2026-07-11", id: "a" },
      { date: "2026-08-01", id: "b" },
      { date: "2026-07-11", id: "c" },
    ]);
    expect(grouped.map((g) => g.date)).toEqual(["2026-08-01", "2026-07-11"]);
    expect(grouped[1]?.items).toHaveLength(2);
  });

  it("formats schedule with calendar date and time range", () => {
    const line = formatFeedSchedulePrimary(
      { date: "2026-07-11", time: "11:00", endTime: "18:30" },
      "de-DE",
      labels,
      new Date("2026-07-01T12:00:00"),
    );
    expect(line).toContain("11. Juli 2026");
    expect(line).toContain("11:00 – 18:30");
  });

  it("uses relative day label when date is today", () => {
    const heading = formatFeedDayHeading("2026-08-03", "de-DE", labels, new Date("2026-08-03T09:00:00"));
    expect(heading).toContain("Heute");
  });

  it("formats valid-until line for news", () => {
    const line = formatFeedValidUntilLine("2026-08-04", "de-DE", labels.validUntil);
    expect(line).toContain("Gültig bis");
    expect(line).toContain("4. Aug. 2026");
  });
});

describe("sommerfestFeedSorted", () => {
  it("sorts news on newer dates before festival day items", () => {
    const sorted = sommerfestFeedSorted();
    const heatIndex = sorted.findIndex((item) => item.id === "feed-news-heat");
    const festivalIndex = sorted.findIndex((item) => item.id === "feed-open");
    expect(heatIndex).toBeGreaterThanOrEqual(0);
    expect(festivalIndex).toBeGreaterThan(heatIndex);
  });
});
