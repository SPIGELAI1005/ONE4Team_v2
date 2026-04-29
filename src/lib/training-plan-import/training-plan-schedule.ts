import { addDays, format, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { TrainingPlanImportDraft, TrainingPlanSlot, WeekdayKey } from "./training-plan-model";

export interface MaterializedTrainingOccurrence {
  date: string; // YYYY-MM-DD (local date)
  startsAtIso: string; // UTC ISO
  endsAtIso: string; // UTC ISO
  slot: TrainingPlanSlot;
  importKey: string;
}

const weekdayIndex: Record<WeekdayKey, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

function weekdayKeyForDate(date: Date): WeekdayKey {
  const d = date.getDay(); // 0..6 (Sun..Sat)
  const entry = (Object.entries(weekdayIndex) as Array<[WeekdayKey, number]>).find(([, idx]) => idx === d);
  return entry ? entry[0] : "mon";
}

function toUtcIso(args: { localDate: string; localTime: string; timezone: string }): string {
  const localIso = `${args.localDate}T${args.localTime}:00`;
  return fromZonedTime(localIso, args.timezone).toISOString();
}

export function buildOccurrenceImportKey(args: {
  clubId: string;
  timezone: string;
  date: string;
  slot: TrainingPlanSlot;
}): string {
  const stable = [
    "training-plan",
    args.clubId,
    args.timezone,
    args.date,
    args.slot.weekday,
    args.slot.pitchCode,
    args.slot.time.startsAtLocalTime,
    args.slot.time.endsAtLocalTime,
    args.slot.teamLabel,
  ]
    .map((s) => String(s).trim())
    .join("|");
  return stable;
}

export function materializeDraftOccurrences(draft: TrainingPlanImportDraft): MaterializedTrainingOccurrence[] {
  const start = parseISO(draft.validFromDate);
  const end = parseISO(draft.validToDate);
  const occurrences: MaterializedTrainingOccurrence[] = [];

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    const date = format(cursor, "yyyy-MM-dd");
    const weekday = weekdayKeyForDate(cursor);
    const slotsToday = draft.slots.filter((s) => s.weekday === weekday);

    for (const slot of slotsToday) {
      const startsAtIso = toUtcIso({ localDate: date, localTime: slot.time.startsAtLocalTime, timezone: draft.timezone });
      const endsAtIso = toUtcIso({ localDate: date, localTime: slot.time.endsAtLocalTime, timezone: draft.timezone });
      const importKey = buildOccurrenceImportKey({ clubId: draft.clubId, timezone: draft.timezone, date, slot });
      occurrences.push({ date, startsAtIso, endsAtIso, slot, importKey });
    }
  }

  return occurrences;
}

