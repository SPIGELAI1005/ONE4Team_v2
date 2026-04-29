import type { SlotDraftRow } from "./training-plan-model";

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

function normalizeTime(value: string): string | null {
  const v = value.trim();
  const m = v.match(/^(\d{1,2}):(\d{2})$/u);
  if (!m) return null;
  const hh = String(Number(m[1])).padStart(2, "0");
  const mm = String(Number(m[2])).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isLikelyTeamLabel(line: string): string | null {
  const s = line.trim();
  if (!s) return null;
  if (s.length > 40) return null;
  if (/trainer werden nachgetragen/iu.test(s)) return null;
  if (/^res_/iu.test(s)) return null;
  if (/^session_/iu.test(s)) return null;

  // Common youth team labels in this plan
  if (/\bU\d{2}(?:-[A-Za-zÄÖÜäöü0-9]+)?(?:-[IVX]{1,3})?\b/u.test(s)) return s;
  if (/\bBambini\b/iu.test(s)) return s;
  if (/\bMäd\.?\b/iu.test(s) && /\ban\b/iu.test(s)) return s; // "Mäd. an den Ball"
  if (/\bI\.?\s*HERREN\b/iu.test(s)) return s;
  if (/\bII\.?\s*HERREN\b/iu.test(s)) return s;
  if (/\bI\.?\s*DAMEN\b/iu.test(s)) return s;
  if (/\bÜ\d{2}\b/iu.test(s)) return s;
  if (/SENIOREN\b/iu.test(s)) return s;
  if (/WALKING\b/iu.test(s)) return s;

  return null;
}

function findNearestTeamLabel(lines: string[], centerIndex: number): string | null {
  for (let d = 1; d <= 6; d += 1) {
    const up = lines[centerIndex - d];
    const down = lines[centerIndex + d];
    const upTeam = up ? isLikelyTeamLabel(up) : null;
    if (upTeam) return upTeam;
    const downTeam = down ? isLikelyTeamLabel(down) : null;
    if (downTeam) return downTeam;
  }
  return null;
}

/**
 * Best-effort slot proposal from PDF text.
 *
 * PDF.js text extraction is usually **not** a perfect table reconstruction, so treat results as a draft.
 */
export function proposeSlotRowsFromPdfText(rawText: string): SlotDraftRow[] {
  const lines = rawText.split(/\r?\n/u).map((l) => l.trim()).filter(Boolean);

  let activeWeekday: SlotDraftRow["weekday"] | null = null;
  const candidates: SlotDraftRow[] = [];

  const timeRe = /\b(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\b/u;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const wd = mapWeekdayFromGerman(line);
    if (wd) activeWeekday = wd;

    const m = line.match(timeRe);
    if (!m || !activeWeekday) continue;

    const start = normalizeTime(m[1] ?? "");
    const end = normalizeTime(m[2] ?? "");
    if (!start || !end) continue;

    const teamLabel = findNearestTeamLabel(lines, i);
    if (!teamLabel) continue;

    // Without spatial info, we can't reliably infer pitch column; user maps pitch codes separately.
    candidates.push({
      weekday: activeWeekday,
      pitchCode: "",
      startsAtLocalTime: start,
      endsAtLocalTime: end,
      teamLabel,
      coachLabels: "",
      locationLabel: "",
      notes: "auto-draft from PDF text (pitch code needs mapping / verification)",
    });
  }

  // De-dupe identical rows
  const key = (r: SlotDraftRow) => `${r.weekday}|${r.startsAtLocalTime}|${r.endsAtLocalTime}|${r.teamLabel}|${r.pitchCode}`;
  const seen = new Set<string>();
  const deduped: SlotDraftRow[] = [];
  for (const r of candidates) {
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }

  // Safety cap
  return deduped.slice(0, 250);
}
