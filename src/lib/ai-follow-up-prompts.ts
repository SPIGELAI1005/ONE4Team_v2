import type { ClubQuickPrompt } from "@/lib/ai-context";

export function buildFollowUpPrompts(
  language: "en" | "de",
  opts: {
    teamName?: string | null;
    hasUpcomingMatch?: boolean;
    hasTrainingThisWeek?: boolean;
  },
): ClubQuickPrompt[] {
  const de = language === "de";
  const team = opts.teamName?.trim();
  const out: ClubQuickPrompt[] = [];

  if (team) {
    out.push({
      label: de ? `${team} Kader` : `${team} roster`,
      prompt: de ? `Wer ist im Kader von ${team}?` : `Who is on the ${team} roster?`,
    });
  }

  if (opts.hasUpcomingMatch) {
    out.push({
      label: de ? "Nächstes Spiel" : "Next match",
      prompt: de ? "Wann ist unser nächstes Spiel und gegen wen?" : "When is our next match and who do we play?",
    });
  }

  if (opts.hasTrainingThisWeek && team) {
    out.push({
      label: de ? "Training absagen" : "Cancel training",
      prompt: de
        ? `Sag ${team} Training diese Woche ab`
        : `Cancel ${team} training this week`,
    });
  } else if (opts.hasTrainingThisWeek) {
    out.push({
      label: de ? "Wochenplan" : "This week",
      prompt: de ? "Welche Trainings sind diese Woche?" : "What trainings are scheduled this week?",
    });
  }

  return out.slice(0, 3);
}
