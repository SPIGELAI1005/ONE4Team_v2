import type { ClubLocalizedContent } from "@/lib/club-public-page-i18n";

export interface BilingualCompletenessItem {
  key: string;
  primaryFilled: boolean;
  secondaryFilled: boolean;
}

export function bilingualContentCompleteness(
  primary: Partial<ClubLocalizedContent>,
  secondary: Partial<ClubLocalizedContent>,
  keys: (keyof ClubLocalizedContent)[],
): BilingualCompletenessItem[] {
  return keys.map((key) => {
    const p = String(primary[key] ?? "").trim();
    const s = String(secondary[key] ?? "").trim();
    return {
      key: String(key),
      primaryFilled: p.length > 0,
      secondaryFilled: s.length > 0,
    };
  });
}

export function missingSecondaryRequiredFields(
  primary: Partial<ClubLocalizedContent>,
  secondary: Partial<ClubLocalizedContent>,
  requiredKeys: (keyof ClubLocalizedContent)[],
): string[] {
  return requiredKeys
    .filter((key) => {
      const hasPrimary = String(primary[key] ?? "").trim().length > 0;
      const hasSecondary = String(secondary[key] ?? "").trim().length > 0;
      return hasPrimary && !hasSecondary;
    })
    .map(String);
}

export function copyPrimaryLocalizedFields(
  primary: ClubLocalizedContent,
  secondary: ClubLocalizedContent,
  keys: (keyof ClubLocalizedContent)[],
): ClubLocalizedContent {
  const next = { ...secondary };
  for (const key of keys) {
    if (!String(secondary[key] ?? "").trim() && String(primary[key] ?? "").trim()) {
      next[key] = primary[key];
    }
  }
  return next;
}
