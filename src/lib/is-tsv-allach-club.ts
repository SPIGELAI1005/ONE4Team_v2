/** True when the active club is TSV Allach 09 (pilot / Sommerfest showcase). */
export function isTsvAllachClub(club?: { name?: string | null; slug?: string | null } | null): boolean {
  if (!club) return false;
  const slug = (club.slug ?? "").toLowerCase();
  const name = (club.name ?? "").toLowerCase();
  return slug.includes("tsv-allach") || slug.includes("allach") || name.includes("tsv allach");
}
