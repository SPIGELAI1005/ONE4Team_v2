/** Filter rows that carry an optional `team_id` (trainings, matches). */
export function filterPublicClubRowsByTeamId<T extends { team_id?: string | null }>(
  rows: T[],
  teamId: string | null | undefined,
): T[] {
  if (!teamId) return rows;
  return rows.filter((row) => row.team_id === teamId);
}

/** Club-wide events (no `team_id`) apply to every team; team-scoped events only when selected. */
export function filterPublicClubEventsByTeamId<T extends { team_id?: string | null }>(
  rows: T[],
  teamId: string | null | undefined,
): T[] {
  if (!teamId) return rows;
  return rows.filter((row) => !row.team_id || row.team_id === teamId);
}
