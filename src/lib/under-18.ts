/** Age helpers for parent / guardian linking (simple calendar-year under-18). */

export function ageYearsFromBirthDate(
  birthDate: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!birthDate?.trim()) return null;
  const parsed = new Date(`${birthDate.trim()}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  let age = asOf.getFullYear() - parsed.getFullYear();
  const monthDiff = asOf.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

/** True when birth date implies the person is under 18 on `asOf`. */
export function isUnder18(
  birthDate: string | null | undefined,
  asOf: Date = new Date(),
): boolean {
  const age = ageYearsFromBirthDate(birthDate, asOf);
  return age != null && age < 18;
}

/** Roles that should show the under-18 guardian link prompt for a ward. */
export function isPlayerLikeRoleForGuardianLink(role: string | null | undefined): boolean {
  const normalized = (role || "").trim().toLowerCase();
  return normalized === "player" || normalized === "player_teen" || normalized === "player_adult";
}
