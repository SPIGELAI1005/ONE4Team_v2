/** Filter rows that carry an optional `team_id` (trainings, matches). */
export function filterPublicClubRowsByTeamId<T extends { team_id?: string | null }>(
  rows: T[],
  teamId: string | null | undefined,
): T[] {
  if (!teamId) return rows;
  return rows.filter((row) => row.team_id === teamId);
}
