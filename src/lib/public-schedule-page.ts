import {
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type {
  EventRowLite,
  PublicMatchLite,
  PublicClubRecord,
  TeamRowLite,
  TrainingSessionRowLite,
} from "@/lib/public-club-models";

export type PublicScheduleRangePreset = "this_week" | "next_week" | "this_month";

export type PublicScheduleEntryKind = "training" | "match" | "event";

export interface PublicScheduleEntry {
  kind: PublicScheduleEntryKind;
  id: string;
  source?: "training_session" | "activity";
  startsAt: string;
  endsAt: string | null;
  title: string;
  teamId: string | null;
  teamName: string | null;
  location: string | null;
  eventType?: string | null;
  match?: PublicMatchLite;
}

export function getPublicScheduleRangeBounds(preset: PublicScheduleRangePreset, ref = new Date()) {
  if (preset === "this_week") {
    const s = startOfWeek(ref, { weekStartsOn: 1 });
    const e = endOfWeek(ref, { weekStartsOn: 1 });
    return { start: startOfDay(s), end: endOfDay(e) };
  }
  if (preset === "next_week") {
    const shifted = addWeeks(ref, 1);
    const s = startOfWeek(shifted, { weekStartsOn: 1 });
    const e = endOfWeek(shifted, { weekStartsOn: 1 });
    return { start: startOfDay(s), end: endOfDay(e) };
  }
  const s = startOfMonth(ref);
  const e = endOfMonth(ref);
  return { start: startOfDay(s), end: endOfDay(e) };
}

export function buildPublicScheduleEntries(params: {
  club: PublicClubRecord | null;
  teams: TeamRowLite[];
  sessions: TrainingSessionRowLite[];
  events: EventRowLite[];
  matches: PublicMatchLite[];
}): PublicScheduleEntry[] {
  const { club, teams, sessions, events, matches } = params;
  const out: PublicScheduleEntry[] = [];

  for (const s of sessions) {
    if (s.publish_to_public_schedule === false) continue;
    out.push({
      kind: "training",
      id: s.id,
      source: s.source,
      startsAt: s.starts_at,
      endsAt: s.ends_at ?? null,
      title: s.title,
      teamId: s.team_id,
      teamName: s.teams?.name ?? null,
      location: s.location,
    });
  }

  for (const e of events) {
    if (e.publish_to_public_schedule === false) continue;
    out.push({
      kind: "event",
      id: e.id,
      startsAt: e.starts_at,
      endsAt: e.ends_at ?? null,
      title: e.title,
      teamId: null,
      teamName: null,
      location: e.location,
      eventType: e.event_type,
    });
  }

  for (const m of matches) {
    if (m.publish_to_public_schedule === false) continue;
    const title = club
      ? m.is_home
        ? `${club.name} vs ${m.opponent}`
        : `${m.opponent} vs ${club.name}`
      : m.opponent;
    const teamName =
      m.teams?.name ?? (m.team_id ? teams.find((tm) => tm.id === m.team_id)?.name ?? null : null);
    out.push({
      kind: "match",
      id: m.id,
      startsAt: m.match_date,
      endsAt: null,
      title,
      teamId: m.team_id,
      teamName,
      location: m.location,
      match: m,
    });
  }

  out.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return out;
}

export function filterScheduleEntriesByRange(entries: PublicScheduleEntry[], start: Date, end: Date) {
  return entries.filter((e) => isWithinInterval(new Date(e.startsAt), { start, end }));
}
