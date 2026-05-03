import type { PublicMatchLite } from "@/lib/public-club-models";

export type PublicMatchStatusBadge = "upcoming" | "live" | "finished" | "cancelled";

export function mergePublicMatchLists(...lists: PublicMatchLite[][]): PublicMatchLite[] {
  const byId = new Map<string, PublicMatchLite>();
  for (const list of lists) {
    for (const m of list) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()];
}

export function publicMatchStatusBadge(status: string): PublicMatchStatusBadge {
  const s = String(status || "").toLowerCase();
  if (s === "in_progress") return "live";
  if (s === "completed") return "finished";
  if (s === "cancelled") return "cancelled";
  return "upcoming";
}

export function publicMatchInDateRange(match: PublicMatchLite, startMs: number, endMs: number) {
  const t = new Date(match.match_date).getTime();
  return t >= startMs && t <= endMs;
}
