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

/** Youth team label (e.g. U16) — generic "member" role may still need a guardian link. */
export function isYouthAgeGroup(ageGroup: string | null | undefined): boolean {
  const normalized = (ageGroup || "").trim().toUpperCase();
  if (!normalized) return false;
  if (/^U-?\d{1,2}$/.test(normalized)) return true;
  return normalized.includes("JUGEND") || normalized.includes("YOUTH");
}

export interface GuardianSafetySectionInput {
  role: string | null | undefined;
  wardLinksCount: number;
  birthDate: string | null | undefined;
  ageGroup?: string | null | undefined;
  canManageMembers: boolean;
}

/** Whether a ward membership role/profile may keep guardian links (player, youth U-team, under-18). */
export function isGuardianEligibleWardRole(
  role: string | null | undefined,
  birthDate?: string | null | undefined,
  ageGroup?: string | null | undefined,
): boolean {
  if (isPlayerLikeRoleForGuardianLink(role)) return true;
  if (isUnder18(birthDate)) return true;
  const normalizedRole = (role || "").trim().toLowerCase();
  if (normalizedRole === "member" && isYouthAgeGroup(ageGroup)) return true;
  return false;
}

/** Whether draft master_data should keep linked guardian membership ids on save. */
export function shouldPersistDraftGuardianMembershipIds(
  role: string | null | undefined,
  masterData: Record<string, unknown>,
  ageGroup?: string | null | undefined,
): boolean {
  const birthDate = typeof masterData.birth_date === "string" ? masterData.birth_date : null;
  return isGuardianEligibleWardRole(role, birthDate, ageGroup);
}

/** Whether Safety tab should show linked-guardian UI for this ward. */
export function shouldShowGuardianSafetySection(input: GuardianSafetySectionInput): boolean {
  const { role, wardLinksCount, birthDate, ageGroup, canManageMembers } = input;

  // Keep assigned guardians visible — do not hide the block after linking.
  if (wardLinksCount > 0) return true;

  const playerLike = isPlayerLikeRoleForGuardianLink(role);
  const under18 = isUnder18(birthDate);
  const youthGroup = isYouthAgeGroup(ageGroup);
  const memberYouth =
    (role || "").trim().toLowerCase() === "member" && youthGroup;

  if (playerLike && (canManageMembers || under18)) return true;
  if (canManageMembers && (under18 || memberYouth)) return true;

  return false;
}
