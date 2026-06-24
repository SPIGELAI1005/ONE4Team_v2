export type ClubPageLanguage = "en" | "de";

export const CLUB_PAGE_LANGUAGES: ClubPageLanguage[] = ["en", "de"];

export interface ClubLocalizedContent {
  description: string;
  meta_title: string;
  meta_description: string;
  news_page_subtitle: string;
  public_location_notes: string;
}

export function emptyClubLocalizedContent(): ClubLocalizedContent {
  return {
    description: "",
    meta_title: "",
    meta_description: "",
    news_page_subtitle: "",
    public_location_notes: "",
  };
}

export function normalizeClubPageLanguage(value: unknown, fallback: ClubPageLanguage = "en"): ClubPageLanguage {
  if (value === "de") return "de";
  if (value === "en") return "en";
  return fallback;
}

export function oppositeClubPageLanguage(lang: ClubPageLanguage): ClubPageLanguage {
  return lang === "en" ? "de" : "en";
}

export function parseSupportedLanguages(raw: unknown, defaultLang: ClubPageLanguage): ClubPageLanguage[] {
  if (!Array.isArray(raw)) return [defaultLang];
  const langs: ClubPageLanguage[] = [];
  for (const item of raw) {
    const lang = normalizeClubPageLanguage(item);
    if (!langs.includes(lang)) langs.push(lang);
  }
  if (!langs.includes(defaultLang)) langs.unshift(defaultLang);
  return langs.length ? langs.slice(0, 2) : [defaultLang];
}

export function parseLocalizedContentMap(raw: unknown): Partial<Record<ClubPageLanguage, Partial<ClubLocalizedContent>>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Partial<Record<ClubPageLanguage, Partial<ClubLocalizedContent>>> = {};
  for (const lang of CLUB_PAGE_LANGUAGES) {
    const block = (raw as Record<string, unknown>)[lang];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const b = block as Record<string, unknown>;
    out[lang] = {
      description: typeof b.description === "string" ? b.description : undefined,
      meta_title: typeof b.meta_title === "string" ? b.meta_title : undefined,
      meta_description: typeof b.meta_description === "string" ? b.meta_description : undefined,
      news_page_subtitle: typeof b.news_page_subtitle === "string" ? b.news_page_subtitle : undefined,
      public_location_notes: typeof b.public_location_notes === "string" ? b.public_location_notes : undefined,
    };
  }
  return out;
}

function pickLocalizedField(
  localized: Partial<Record<ClubPageLanguage, Partial<ClubLocalizedContent>>> | undefined,
  lang: ClubPageLanguage,
  field: keyof ClubLocalizedContent,
): string {
  return localized?.[lang]?.[field]?.trim() ?? "";
}

export function resolveLocalizedField(
  lang: ClubPageLanguage,
  defaultLang: ClubPageLanguage,
  supported: ClubPageLanguage[],
  localized: Partial<Record<ClubPageLanguage, Partial<ClubLocalizedContent>>> | undefined,
  primaryFallback: string | null | undefined,
  field: keyof ClubLocalizedContent,
): string | null {
  const active = supported.includes(lang) ? lang : defaultLang;
  const value =
    pickLocalizedField(localized, active, field)
    || pickLocalizedField(localized, defaultLang, field)
    || (primaryFallback?.trim() ?? "");
  return value || null;
}
