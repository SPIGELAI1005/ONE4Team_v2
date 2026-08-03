/** Matches older than this are shown in history, not the current list. */
export const MATCH_CURRENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function matchCurrentCutoffDate(now = new Date()): Date {
  return new Date(now.getTime() - MATCH_CURRENT_WINDOW_MS);
}

export function matchCurrentCutoffIso(now = new Date()): string {
  return matchCurrentCutoffDate(now).toISOString();
}

export function isMatchInCurrentWindow(matchDateIso: string, now = new Date()): boolean {
  const ts = new Date(matchDateIso).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= matchCurrentCutoffDate(now).getTime();
}
