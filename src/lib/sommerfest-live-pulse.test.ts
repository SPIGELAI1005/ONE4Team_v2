import { describe, expect, it } from "vitest";
import { isSommerfestLivePulsateActive } from "@/lib/sommerfest-live-pulse";

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
