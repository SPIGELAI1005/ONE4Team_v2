import { z } from "zod";

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface SlotDraftRow {
  weekday: WeekdayKey;
  pitchCode: string;
  startsAtLocalTime: string;
  endsAtLocalTime: string;
  teamLabel: string;
  coachLabels: string;
  locationLabel: string;
  notes: string;
}

export interface TrainingPlanTimeRange {
  startsAtLocalTime: string; // HH:mm (24h)
  endsAtLocalTime: string; // HH:mm (24h)
}

export interface TrainingPlanSlot {
  weekday: WeekdayKey;
  pitchCode: string; // e.g. KR1, AF2, KF1 (mapped later to club_pitches.id)
  time: TrainingPlanTimeRange;
  teamLabel: string; // e.g. U15-I, U10-Mäd, Bambini
  coachLabels: string[]; // e.g. ["Stefan J.", "Ralf G."] (mapped later to placeholders)
  durationMinutes: number;
  locationLabel: string | null; // optional free text (PDF may encode like "Kunstrasen")
  notes: string | null;
  source: {
    documentLabel: string; // filename/version
    pageNumber: number; // 1-based
    rawText: string; // raw token/cell content for audit/debug
  };
}

export interface TrainingPlanImportDraft {
  clubId: string;
  timezone: string; // IANA TZ, e.g. "Europe/Berlin"
  validFromDate: string; // YYYY-MM-DD (local date in timezone)
  validToDate: string; // YYYY-MM-DD
  slots: TrainingPlanSlot[];
}

const localTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/u, "Expected HH:mm")
  .refine((value) => {
    const [h, m] = value.split(":").map((x) => Number(x));
    return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }, "Invalid time");

export const trainingPlanTimeRangeSchema = z.object({
  startsAtLocalTime: localTimeSchema,
  endsAtLocalTime: localTimeSchema,
});

export const trainingPlanSlotSchema = z.object({
  weekday: z.enum(WEEKDAY_KEYS),
  pitchCode: z.string().trim().min(1),
  time: trainingPlanTimeRangeSchema,
  teamLabel: z.string().trim().min(1),
  coachLabels: z.array(z.string().trim().min(1)).default([]),
  durationMinutes: z.number().int().positive(),
  locationLabel: z.string().trim().min(1).nullable(),
  notes: z.string().trim().min(1).nullable(),
  source: z.object({
    documentLabel: z.string().trim().min(1),
    pageNumber: z.number().int().positive(),
    rawText: z.string(),
  }),
});

export const trainingPlanImportDraftSchema = z.object({
  clubId: z.string().uuid(),
  timezone: z.string().trim().min(1),
  validFromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected YYYY-MM-DD"),
  validToDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected YYYY-MM-DD"),
  slots: z.array(trainingPlanSlotSchema),
});

export function computeDurationMinutes(time: TrainingPlanTimeRange): number {
  const [sh, sm] = time.startsAtLocalTime.split(":").map((x) => Number(x));
  const [eh, em] = time.endsAtLocalTime.split(":").map((x) => Number(x));
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return Math.max(0, end - start);
}

export function splitCoachLabels(value: string): string[] {
  const normalized = value
    .replace(/\s+&\s+/gu, ",")
    .replace(/\s+und\s+/giu, ",")
    .replace(/\s+\/\s+/gu, ",")
    .replace(/\s+,\s+/gu, ",");
  return normalized
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

