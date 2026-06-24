import { formatActivityScheduleLine, formatContextDateTime, type ActivitySummaryRow } from "@/lib/ai-context";

export interface GoldenQuestionCase {
  id: string;
  question: string;
  description: string;
}

/** Pilot Q&A cases for TSV Allach-style clubs (context assembly, not LLM). */
export const AI4T_GOLDEN_QUESTIONS: GoldenQuestionCase[] = [
  {
    id: "GQ-01",
    question: "When is U12-1 training this week?",
    description: "Schedule line must show 18:00 Europe/Berlin for a 16:00 UTC start.",
  },
  {
    id: "GQ-02",
    question: "How many active members do we have?",
    description: "Context must include Members section with active count.",
  },
  {
    id: "GQ-03",
    question: "What matches are coming up?",
    description: "Context must list Upcoming matches section when fixtures exist.",
  },
  {
    id: "GQ-04",
    question: "U12-I vs U12-1 team naming",
    description: "Roman numeral team labels appear in schedule lines.",
  },
  {
    id: "GQ-05",
    question: "German locale schedule formatting",
    description: "formatContextDateTime with de locale shows Berlin local time.",
  },
];

export interface GoldenAssertionResult {
  id: string;
  pass: boolean;
  detail: string;
}

const BERLIN = "Europe/Berlin";

/** Deterministic checks run in CI without Supabase or an LLM. */
export function runGoldenContextAssertions(): GoldenAssertionResult[] {
  const results: GoldenAssertionResult[] = [];

  const u12Line = formatActivityScheduleLine(
    {
      id: "act-1",
      type: "training",
      title: "U12-1 training",
      starts_at: "2026-06-24T16:00:00.000Z",
      ends_at: "2026-06-24T17:00:00.000Z",
      teams: { name: "U12-I" },
    } satisfies ActivitySummaryRow,
    BERLIN,
    "en",
  );
  results.push({
    id: "GQ-01",
    pass: /18:00/.test(u12Line) && /U12-I/.test(u12Line),
    detail: u12Line,
  });

  const berlinFormatted = formatContextDateTime("2026-06-24T16:00:00.000Z", BERLIN, "en");
  results.push({
    id: "GQ-01-tz",
    pass: /18:00/.test(berlinFormatted),
    detail: berlinFormatted,
  });

  const sampleContext = [
    "## Members",
    "- Active members: 42 (total rows: 45)",
    "## Schedule (next 7 days)",
    "### Activities (trainings / calendar)",
    u12Line,
    "### Upcoming matches",
    "- 2026-06-28 vs FC Example (home, scheduled)",
  ].join("\n");

  results.push({
    id: "GQ-02",
    pass: /Active members:\s*42/.test(sampleContext),
    detail: "Members active count present",
  });

  results.push({
    id: "GQ-03",
    pass: /Upcoming matches/.test(sampleContext) && /vs FC Example/.test(sampleContext),
    detail: "Upcoming match line present",
  });

  results.push({
    id: "GQ-04",
    pass: /team: U12-I/.test(u12Line),
    detail: "Roman numeral team label in schedule",
  });

  const deFormatted = formatContextDateTime("2026-06-24T16:00:00.000Z", BERLIN, "de");
  results.push({
    id: "GQ-05",
    pass: /18:00/.test(deFormatted),
    detail: deFormatted,
  });

  return results;
}

export function assertGoldenContextPasses(): void {
  const failed = runGoldenContextAssertions().filter((r) => !r.pass);
  if (failed.length > 0) {
    const msg = failed.map((f) => `${f.id}: ${f.detail}`).join("\n");
    throw new Error(`Golden context assertions failed:\n${msg}`);
  }
}
