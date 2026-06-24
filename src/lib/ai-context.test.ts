import { describe, expect, it } from "vitest";

import {
  formatActivityScheduleLine,
  formatContextDateTime,
  formatMatchesByTeam,
  formatVenueLines,
  type ActivitySummaryRow,
} from "@/lib/ai-context";
import {
  AI4T_GOLDEN_QUESTIONS,
  assertGoldenContextPasses,
  runGoldenContextAssertions,
} from "@/lib/ai-context-golden";

const BERLIN = "Europe/Berlin";

describe("formatContextDateTime", () => {
  it("formats UTC instants in Europe/Berlin for LLM context (en)", () => {
    const formatted = formatContextDateTime("2026-06-24T16:00:00.000Z", BERLIN, "en");
    expect(formatted).toMatch(/24/);
    expect(formatted).toMatch(/06/);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/18:00/);
  });

  it("formats UTC instants in Europe/Berlin for LLM context (de) — GQ-05", () => {
    const formatted = formatContextDateTime("2026-06-24T16:00:00.000Z", BERLIN, "de");
    expect(formatted).toMatch(/18:00/);
    expect(formatted).toMatch(/2026/);
  });

  it("uses club timezone for winter CET offset", () => {
    const formatted = formatContextDateTime("2026-01-15T17:00:00.000Z", BERLIN, "en");
    expect(formatted).toMatch(/18:00/);
  });
});

describe("formatActivityScheduleLine", () => {
  const u12Activity: ActivitySummaryRow = {
    id: "act-1",
    type: "training",
    title: "U12-1 training",
    starts_at: "2026-06-24T16:00:00.000Z",
    ends_at: "2026-06-24T17:00:00.000Z",
    teams: { name: "U12-I" },
  };

  it("includes local start time, end time, type, title, and team — GQ-01 / GQ-04", () => {
    const line = formatActivityScheduleLine(u12Activity, BERLIN, "en");
    expect(line).toMatch(/18:00/);
    expect(line).toMatch(/\[training\]/);
    expect(line).toMatch(/U12-1 training/);
    expect(line).toMatch(/team: U12-I/);
  });

  it("omits team suffix when team name is missing", () => {
    const line = formatActivityScheduleLine(
      { ...u12Activity, teams: null },
      BERLIN,
      "en",
    );
    expect(line).not.toMatch(/team:/);
  });
});

describe("formatMatchesByTeam", () => {
  it("groups matches under team headings", () => {
    const lines = formatMatchesByTeam(
      [
        {
          opponent: "FC Test",
          match_date: "2026-06-28T14:00:00.000Z",
          status: "scheduled",
          is_home: true,
          home_score: null,
          away_score: null,
          teams: { name: "U12-I" },
        },
      ],
      "en",
    );
    expect(lines.some((l) => l.includes("### U12-I"))).toBe(true);
    expect(lines.some((l) => l.includes("FC Test"))).toBe(true);
  });
});

describe("formatVenueLines", () => {
  it("lists unique venues", () => {
    const lines = formatVenueLines(["Hauptplatz", "Hauptplatz", "Halle"], "de");
    expect(lines).toEqual(["- Halle", "- Hauptplatz"]);
  });
});

describe("AI4T golden context harness", () => {
  it("defines pilot golden question metadata", () => {
    expect(AI4T_GOLDEN_QUESTIONS.length).toBeGreaterThanOrEqual(4);
    expect(AI4T_GOLDEN_QUESTIONS.map((q) => q.id)).toContain("GQ-01");
  });

  it("passes all automated golden context assertions", () => {
    expect(() => assertGoldenContextPasses()).not.toThrow();
  });

  it("reports per-case results for debugging", () => {
    const results = runGoldenContextAssertions();
    expect(results.every((r) => r.pass)).toBe(true);
    expect(results.some((r) => r.id === "GQ-01")).toBe(true);
    expect(results.some((r) => r.id === "GQ-05")).toBe(true);
  });
});
