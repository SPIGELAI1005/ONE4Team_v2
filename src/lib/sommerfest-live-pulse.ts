import { SOMMERFEST_DATE } from "@/lib/tsv-allach-sommerfest-2026";

/** Sommerfest day start (Europe/Berlin) - live tournament CTA pulse begins here. */
const SOMMERFEST_PULSE_START_MS = new Date(`${SOMMERFEST_DATE}T00:00:00+02:00`).getTime();

export function isSommerfestLivePulsateActive(now = new Date()): boolean {
  return now.getTime() >= SOMMERFEST_PULSE_START_MS;
}

/** True from festival day until every planned fixture is completed (public tournament board). */
export function isSommerfestTournamentInProgress(
  finishedCount: number,
  totalCount: number,
  now = new Date(),
): boolean {
  if (totalCount <= 0) return false;
  if (!isSommerfestLivePulsateActive(now)) return false;
  return finishedCount < totalCount;
}

export interface SommerfestBannerMatchRow {
  status: string;
  match_date: string;
}

/** Any Sommerfest fixture currently in progress (matches public board live badge). */
export function hasSommerfestLiveMatches(rows: { status: string }[]): boolean {
  return rows.some((row) => String(row.status || "").toLowerCase() === "in_progress");
}

/** Live/finished counts for the public tournament banner - ignores pre-kickoff "completed" test data. */
export function sommerfestBannerMatchStats(
  rows: SommerfestBannerMatchRow[],
  now = new Date(),
): { liveCount: number; finishedCount: number } {
  const nowMs = now.getTime();
  const hasStarted = (row: SommerfestBannerMatchRow) => new Date(row.match_date).getTime() <= nowMs;

  return {
    liveCount: rows.filter((row) => row.status === "in_progress" && hasStarted(row)).length,
    finishedCount: rows.filter((row) => row.status === "completed" && hasStarted(row)).length,
  };
}
