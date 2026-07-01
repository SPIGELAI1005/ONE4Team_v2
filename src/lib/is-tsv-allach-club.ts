/** Canonical public slug for TSV Allach 09 (pilot club). */
export const TSV_ALLACH_09_CLUB_SLUG = "tsv-allach-09";

/** Strict match — use for club-specific data (address, catalog, etc.) that must not leak to other clubs. */
export function isTsvAllach09Club(club?: { slug?: string | null } | null): boolean {
  return (club?.slug ?? "").toLowerCase() === TSV_ALLACH_09_CLUB_SLUG;
}

/** True when the active club is TSV Allach 09 (pilot / Sommerfest showcase). */
export function isTsvAllachClub(club?: { name?: string | null; slug?: string | null } | null): boolean {
  if (!club) return false;
  if (isTsvAllach09Club(club)) return true;
  const slug = (club.slug ?? "").toLowerCase();
  const name = (club.name ?? "").toLowerCase();
  return slug.includes("tsv-allach") || name.includes("tsv allach");
}
