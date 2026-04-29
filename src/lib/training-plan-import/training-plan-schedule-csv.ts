import type { SlotDraftRow } from "./training-plan-model";
import { parseCsvRows } from "./csv-parse";

function mapWeekdayFromGerman(value: string): SlotDraftRow["weekday"] | null {
  const v = value.trim().toLowerCase();
  if (v.startsWith("mo")) return "mon";
  if (v.startsWith("di")) return "tue";
  if (v.startsWith("mi")) return "wed";
  if (v.startsWith("do")) return "thu";
  if (v.startsWith("fr")) return "fri";
  if (v.startsWith("sa")) return "sat";
  if (v.startsWith("so")) return "sun";
  return null;
}

function normalizeTime(value: string): string {
  const v = value.trim();
  const m = v.match(/^(\d{1,2}):(\d{2})$/u);
  if (!m) return v;
  const hh = String(Number(m[1])).padStart(2, "0");
  const mm = String(Number(m[2])).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function parseTrainingScheduleCsvToSlotRows(text: string): SlotDraftRow[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];

  const out: SlotDraftRow[] = [];
  for (const row of rows) {
    const sessionType = (row.session_type ?? "").trim().toLowerCase();
    if (sessionType && sessionType !== "training") continue;

    const weekday = mapWeekdayFromGerman(row.weekday ?? "");
    if (!weekday) continue;

    const pitchCode = (row.field_slot ?? "").trim();
    const teamLabel = (row.team_name ?? "").trim();
    if (!pitchCode || !teamLabel) continue;

    const startsAtLocalTime = normalizeTime(row.start_time ?? "");
    const endsAtLocalTime = normalizeTime(row.end_time ?? "");
    if (!startsAtLocalTime || !endsAtLocalTime) continue;

    const trainersRaw = (row.trainers ?? "").trim();
    const coachLabels = trainersRaw ? trainersRaw.replace(/\s*\|\s*/gu, ", ") : "";

    out.push({
      weekday,
      pitchCode,
      startsAtLocalTime,
      endsAtLocalTime,
      teamLabel,
      coachLabels,
      locationLabel: "",
      notes: "",
    });
  }

  return out;
}
