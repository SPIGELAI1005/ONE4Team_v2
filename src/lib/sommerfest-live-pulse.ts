import { SOMMERFEST_DATE } from "@/lib/tsv-allach-sommerfest-2026";

/** Sommerfest day start (Europe/Berlin) — live tournament CTA pulse begins here. */
const SOMMERFEST_PULSE_START_MS = new Date(`${SOMMERFEST_DATE}T00:00:00+02:00`).getTime();

export function isSommerfestLivePulsateActive(now = new Date()): boolean {
  return now.getTime() >= SOMMERFEST_PULSE_START_MS;
}
