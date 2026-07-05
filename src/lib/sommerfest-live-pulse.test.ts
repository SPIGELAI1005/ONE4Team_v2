import { describe, expect, it } from "vitest";
import {
  hasSommerfestLiveMatches,
  isSommerfestLivePulsateActive,
  isSommerfestTournamentInProgress,
  sommerfestBannerMatchStats,
} from "@/lib/sommerfest-live-pulse";

describe("sommerfest-live-pulse", () => {
  it("is inactive before 11 July 2026", () => {
    expect(isSommerfestLivePulsateActive(new Date("2026-07-10T23:59:59+02:00"))).toBe(false);
  });

  it("is active from 11 July 2026 00:00 Europe/Berlin", () => {
    expect(isSommerfestLivePulsateActive(new Date("2026-07-11T00:00:00+02:00"))).toBe(true);
  });

  it("stays active after festival day", () => {
    expect(isSommerfestLivePulsateActive(new Date("2026-07-12T12:00:00+02:00"))).toBe(true);
  });
});

describe("isSommerfestTournamentInProgress", () => {
  const festivalDay = new Date("2026-07-11T14:00:00+02:00");
  const beforeFestival = new Date("2026-07-10T12:00:00+02:00");

  it("is false before festival day", () => {
    expect(isSommerfestTournamentInProgress(0, 22, beforeFestival)).toBe(false);
  });

  it("is true on festival day while matches remain open", () => {
    expect(isSommerfestTournamentInProgress(5, 22, festivalDay)).toBe(true);
    expect(isSommerfestTournamentInProgress(0, 22, festivalDay)).toBe(true);
  });

  it("is false once every planned match is finished", () => {
    expect(isSommerfestTournamentInProgress(22, 22, festivalDay)).toBe(false);
  });
});

describe("hasSommerfestLiveMatches", () => {
  it("is true when any row is in_progress", () => {
    expect(hasSommerfestLiveMatches([{ status: "scheduled" }, { status: "in_progress" }])).toBe(true);
  });

  it("is false when no row is in_progress", () => {
    expect(hasSommerfestLiveMatches([{ status: "scheduled" }, { status: "completed" }])).toBe(false);
  });
});

describe("sommerfestBannerMatchStats", () => {
  const beforeTournament = new Date("2026-07-01T12:00:00+02:00");
  const duringTournament = new Date("2026-07-11T14:00:00+02:00");

  it("ignores completed matches before their kickoff (pre-tournament test data)", () => {
    const stats = sommerfestBannerMatchStats(
      [
        { status: "completed", match_date: "2026-07-11T10:00:00+02:00" },
        { status: "completed", match_date: "2026-07-11T11:00:00+02:00" },
        { status: "scheduled", match_date: "2026-07-11T12:00:00+02:00" },
      ],
      beforeTournament,
    );
    expect(stats.finishedCount).toBe(0);
    expect(stats.liveCount).toBe(0);
  });

  it("counts completed matches after kickoff on tournament day", () => {
    const stats = sommerfestBannerMatchStats(
      [
        { status: "completed", match_date: "2026-07-11T10:00:00+02:00" },
        { status: "completed", match_date: "2026-07-11T11:00:00+02:00" },
        { status: "in_progress", match_date: "2026-07-11T13:00:00+02:00" },
        { status: "scheduled", match_date: "2026-07-11T15:00:00+02:00" },
      ],
      duringTournament,
    );
    expect(stats.finishedCount).toBe(2);
    expect(stats.liveCount).toBe(1);
  });
});
