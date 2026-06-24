import type { AgentProposalPayload } from "@/lib/ai-agent/types";

export interface CancelTrainingTarget {
  teamName: string | null;
  title: string;
  when: string | null;
  reason: string | null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function formatTrainingWhen(iso: string, language: "en" | "de"): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const locale = language === "de" ? "de-DE" : "en-GB";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function parseSummaryHeadline(summary: string | null | undefined): Partial<CancelTrainingTarget> {
  if (!summary?.trim()) return {};
  const match = summary.match(
    /(?:will be cancelled|wird abgesagt|Folgende Einheit wird abgesagt):\s*(.+?)(?:\.|\s+Parents|\s+Eltern)/i,
  );
  if (!match?.[1]) return {};

  const headline = match[1].trim().replace(/^["„]|["”]$/g, "");
  const parts = headline.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { title: headline };

  const whenPattern =
    /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}:\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember/i;
  const whenIdx = parts.findIndex((p) => whenPattern.test(p));

  if (whenIdx >= 0) {
    const when = parts[whenIdx];
    const remaining = parts.filter((_, i) => i !== whenIdx);
    const teamName = remaining.length > 1 ? remaining[0] : null;
    const title = remaining.length > 1 ? remaining.slice(1).join(" · ") : remaining[0] ?? headline;
    return { teamName, title, when };
  }

  if (parts.length >= 2) {
    return { teamName: parts[0], title: parts.slice(1).join(" · ") };
  }

  return { title: parts[0] };
}

export function extractCancelTrainingTarget(
  body: AgentProposalPayload,
  language: "en" | "de",
): CancelTrainingTarget | null {
  const cancelStep = body.steps?.find((step) => step.tool === "cancel_training");
  if (!cancelStep) return null;

  const params = cancelStep.params ?? {};
  const fromSummary = parseSummaryHeadline(body.summary);
  const teamName = readString(params.team_name) ?? fromSummary.teamName ?? null;
  const title =
    readString(params.activity_title) ??
    readString(params.title) ??
    fromSummary.title ??
    (language === "de" ? "Training" : "Training");
  const startsAt = readString(params.starts_at) ?? readString(params.activity_starts_at);
  const when =
    (startsAt ? formatTrainingWhen(startsAt, language) : null) ?? fromSummary.when ?? null;
  const reason = readString(params.reason);

  return { teamName, title, when, reason };
}

export function formatCancelTrainingHeadline(target: CancelTrainingTarget, language: "en" | "de"): string {
  const parts = [target.teamName, target.title, target.when].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return language === "de" ? "Trainingseinheit" : "Training session";
}
