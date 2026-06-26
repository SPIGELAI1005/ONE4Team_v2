import { describe, expect, it } from "vitest";
import {
  findTsvAllachShowcaseEventById,
  getTsvAllachShowcaseEvents,
  mergePublicClubEvents,
} from "@/lib/tsv-allach-public-events";

describe("tsv-allach-public-events", () => {
  it("builds Sommerfest and camp events for TSV Allach", () => {
    const en = getTsvAllachShowcaseEvents("en");
    expect(en.length).toBe(3);
    expect(en.some((e) => e.title.includes("Summer Festival"))).toBe(true);
    expect(en.some((e) => e.event_type === "camp")).toBe(true);
  });

  it("resolves showcase event by id", () => {
    const event = findTsvAllachShowcaseEventById("tsv-showcase-event-sommerfest-2026", "de");
    expect(event?.title).toContain("Sommerfest");
  });

  it("merges showcase only for TSV Allach", () => {
    const club = { slug: "tsv-allach-09", name: "TSV Allach 09" };
    const merged = mergePublicClubEvents(club, [], "en");
    expect(merged.length).toBe(3);
    expect(mergePublicClubEvents({ slug: "other", name: "Other" }, [], "en")).toEqual([]);
  });
});
