import { trainingPlanImportDraftSchema, type TrainingPlanImportDraft, type TrainingPlanSlot, WEEKDAY_KEYS } from "./training-plan-model";
import { splitCoachLabels } from "./training-plan-model";

export interface TrainingPlanPdfExtraction {
  documentLabel: string;
  validFromDateHint: string | null; // YYYY-MM-DD if detected
  pitchCodes: string[];
  teamLabels: string[];
  coachLabels: string[];
  rawText: string;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function extractValidFromDate(rawText: string): string | null {
  const match = rawText.match(/gültig\s+ab\s+(\d{2})\.(\d{2})\.(\d{4})/iu);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function extractPitchCodes(rawText: string): string[] {
  const matches = rawText.match(/\b(?:KR|AF|KF)\s?\d\b/gu) ?? [];
  const normalized = matches.map((m) => m.replace(/\s+/gu, "").toUpperCase());
  return uniqueSorted(normalized);
}

function extractTeamLabels(rawText: string): string[] {
  const matches = rawText.match(/\bU\s?\d{2}(?:-\w+)?(?:-[IVX]{1,3})?\b/giu) ?? [];
  const normalized = matches.map((m) => m.replace(/\s+/gu, "").replace(/U/iu, "U").trim());
  return uniqueSorted(normalized);
}

function extractCoachLabels(rawText: string): string[] {
  const tokens = rawText
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = tokens
    .filter((line) => line.includes("&") || /\bund\b/iu.test(line) || /,\s*/u.test(line))
    .filter((line) => /[A-Za-zÄÖÜäöü]/u.test(line))
    .filter((line) => !/\bU\d{2}\b/iu.test(line));

  const names = candidates.flatMap((line) => splitCoachLabels(line));
  return uniqueSorted(names);
}

export async function extractTrainingPlanFromPdf(file: File): Promise<TrainingPlanPdfExtraction> {
  const pdfjs = await import("pdfjs-dist");

  // Vite + ESM: workerSrc must be a URL string (or you can use workerPort).
  // Using URL() keeps it bundler-friendly and avoids “Invalid 'workerSrc' type”.
  // @ts-expect-error - pdfjs-dist exposes GlobalWorkerOptions at runtime
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>).map((it) => it.str ?? "").join("\n");
    pages.push(text);
  }
  const rawText = pages.join("\n\n");

  const extraction: TrainingPlanPdfExtraction = {
    documentLabel: file.name,
    validFromDateHint: extractValidFromDate(rawText),
    pitchCodes: extractPitchCodes(rawText),
    teamLabels: extractTeamLabels(rawText),
    coachLabels: extractCoachLabels(rawText),
    rawText,
  };

  return extraction;
}

/**
 * Minimal “best effort” slot extraction from raw PDF text.
 * Because PDFs often lose table layout, this returns an empty slot list unless
 * a structured training slot template is provided by the user in the UI.
 */
export function buildDraftFromPdfExtraction(args: {
  clubId: string;
  timezone: string;
  validFromDate: string;
  validToDate: string;
  extraction: TrainingPlanPdfExtraction;
  slots: TrainingPlanSlot[];
}): TrainingPlanImportDraft {
  const draft: TrainingPlanImportDraft = {
    clubId: args.clubId,
    timezone: args.timezone,
    validFromDate: args.validFromDate,
    validToDate: args.validToDate,
    slots: args.slots,
  };
  return trainingPlanImportDraftSchema.parse(draft);
}

export const WEEKDAY_LABELS_DE: Record<string, (typeof WEEKDAY_KEYS)[number]> = {
  montag: "mon",
  dienstag: "tue",
  mittwoch: "wed",
  donnerstag: "thu",
  freitag: "fri",
  samstag: "sat",
  sonntag: "sun",
};

