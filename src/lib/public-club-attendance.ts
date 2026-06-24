export type RsvpActivityLite = {
  id: string;
  type: "training" | "match" | "event";
  starts_at: string;
  team_id: string | null;
  title: string;
};

export interface PublicClubRsvpTarget {
  kind: "training" | "match";
  id: string;
  source?: "training_session" | "activity";
  startsAt: string;
  teamId: string | null;
  title: string;
}

const TIME_TOLERANCE_MS = 3 * 60 * 1000;

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function timesClose(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= TIME_TOLERANCE_MS;
}

/** Map a public training row or match to an `activities.id` for `activity_attendance`. */
export function resolvePublicClubRsvpActivityId(
  target: PublicClubRsvpTarget,
  activities: RsvpActivityLite[],
): string | null {
  if (target.kind === "training" && target.source === "activity") return target.id;

  const activityType = target.kind === "match" ? "match" : "training";
  const candidates = activities.filter((a) => a.type === activityType);

  const exact = candidates.find(
    (a) =>
      timesClose(a.starts_at, target.startsAt) &&
      (a.team_id || null) === (target.teamId || null) &&
      normalizeTitle(a.title) === normalizeTitle(target.title),
  );
  if (exact) return exact.id;

  const byTimeTeam = candidates.find(
    (a) => timesClose(a.starts_at, target.startsAt) && (a.team_id || null) === (target.teamId || null),
  );
  if (byTimeTeam) return byTimeTeam.id;

  if (candidates.some((a) => a.id === target.id)) return target.id;

  return null;
}

export function publicClubRsvpTargetFromTraining(session: {
  id: string;
  source?: "training_session" | "activity";
  starts_at: string;
  team_id: string | null;
  title: string;
}): PublicClubRsvpTarget {
  return {
    kind: "training",
    id: session.id,
    source: session.source,
    startsAt: session.starts_at,
    teamId: session.team_id,
    title: session.title,
  };
}

export function publicClubRsvpTargetFromMatch(match: {
  id: string;
  match_date: string;
  team_id: string | null;
  opponent: string;
  is_home: boolean;
  clubName: string;
}): PublicClubRsvpTarget {
  const title = match.is_home ? `${match.clubName} vs ${match.opponent}` : `${match.opponent} vs ${match.clubName}`;
  return {
    kind: "match",
    id: match.id,
    startsAt: match.match_date,
    teamId: match.team_id,
    title,
  };
}
