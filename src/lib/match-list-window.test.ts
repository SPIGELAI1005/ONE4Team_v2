import { describe, expect, it } from "vitest";
import {
  isMatchInCurrentWindow,
  matchCurrentCutoffDate,
  MATCH_CURRENT_WINDOW_MS,
} from "./match-list-window";

describe("match-list-window", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it("treats matches within 24h as current", () => {
    const recent = new Date(now.getTime() - MATCH_CURRENT_WINDOW_MS + 60_000).toISOString();
    expect(isMatchInCurrentWindow(recent, now)).toBe(true);
  });

  it("treats matches older than 24h as history", () => {
    const old = new Date(now.getTime() - MATCH_CURRENT_WINDOW_MS - 60_000).toISOString();
    expect(isMatchInCurrentWindow(old, now)).toBe(false);
  });

  it("includes kickoff exactly at cutoff in current window", () => {
    const atCutoff = matchCurrentCutoffDate(now).toISOString();
    expect(isMatchInCurrentWindow(atCutoff, now)).toBe(true);
  });
});
