export interface DayScheduleBookingInput {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  pitch_id: string;
  team_id: string | null;
  booking_type: "training" | "match" | "other";
  status: string;
  activity_id?: string | null;
}

export interface DayScheduleSessionInput {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  team_id: string | null;
}

export interface DayScheduleItem {
  key: string;
  kind: "booking" | "training";
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  pitchId: string | null;
  teamId: string | null;
  bookingType: "training" | "match" | "other" | null;
  location: string | null;
  status: string | null;
  activityId: string | null;
}

function startsNear(a: string, b: string, maxDeltaMs = 2 * 60 * 1000): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= maxDeltaMs;
}

function titlesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** True when a pitch booking already represents this training session. */
export function bookingCoversSession(
  booking: DayScheduleBookingInput,
  session: DayScheduleSessionInput,
): boolean {
  if (booking.status === "cancelled") return false;
  if (booking.activity_id && booking.activity_id === session.id) return true;
  if (booking.booking_type !== "training") return false;
  if ((booking.team_id || "") !== (session.team_id || "")) return false;
  if (!titlesMatch(booking.title, session.title)) return false;
  return startsNear(booking.starts_at, session.starts_at);
}

/**
 * Build a unified day schedule: pitch bookings plus trainings that are not already
 * represented by a booking (so Asset Map Day schedule matches Training Sessions).
 */
export function buildDayScheduleItems(input: {
  bookings: DayScheduleBookingInput[];
  sessions: DayScheduleSessionInput[];
}): DayScheduleItem[] {
  const items: DayScheduleItem[] = [];

  for (const booking of input.bookings) {
    if (booking.status === "cancelled") continue;
    items.push({
      key: `booking:${booking.id}`,
      kind: "booking",
      id: booking.id,
      title: booking.title,
      startsAt: new Date(booking.starts_at),
      endsAt: booking.ends_at ? new Date(booking.ends_at) : null,
      pitchId: booking.pitch_id,
      teamId: booking.team_id,
      bookingType: booking.booking_type,
      location: null,
      status: booking.status,
      activityId: booking.activity_id ?? null,
    });
  }

  for (const session of input.sessions) {
    const covered = input.bookings.some((booking) => bookingCoversSession(booking, session));
    if (covered) continue;
    items.push({
      key: `training:${session.id}`,
      kind: "training",
      id: session.id,
      title: session.title,
      startsAt: new Date(session.starts_at),
      endsAt: session.ends_at ? new Date(session.ends_at) : null,
      pitchId: null,
      teamId: session.team_id,
      bookingType: "training",
      location: session.location,
      status: null,
      activityId: session.id,
    });
  }

  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
