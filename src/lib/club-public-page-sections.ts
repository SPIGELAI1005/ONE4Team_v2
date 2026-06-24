export const PUBLIC_PAGE_SECTION_KEYS = [
  "about",
  "news",
  "teams",
  "shop",
  "media",
  "schedule",
  "events",
  "matches",
  "messages",
  "ai4team",
  "documents",
  "faq",
  "nextsteps",
  "reports",
  "livescores",
  "contact",
] as const;

export type PublicPageSectionId = (typeof PUBLIC_PAGE_SECTION_KEYS)[number];

export type PublicPageSectionsState = Record<PublicPageSectionId, boolean>;

export const DEFAULT_PUBLIC_PAGE_SECTIONS: PublicPageSectionsState = {
  about: true,
  news: true,
  teams: true,
  shop: true,
  media: true,
  schedule: true,
  events: true,
  matches: true,
  messages: true,
  ai4team: true,
  documents: true,
  faq: true,
  nextsteps: true,
  reports: true,
  livescores: true,
  contact: true,
};

/** Legacy JSON key from pre-AI 4 T rebrand (`public_page_sections.one4ai`). */
const LEGACY_AI_SECTION_KEY = "one4ai";

export function parsePublicPageSections(raw: unknown): PublicPageSectionsState {
  const next = { ...DEFAULT_PUBLIC_PAGE_SECTIONS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return next;
  const record = { ...(raw as Record<string, unknown>) };
  if (typeof record[LEGACY_AI_SECTION_KEY] === "boolean" && typeof record.ai4team !== "boolean") {
    record.ai4team = record[LEGACY_AI_SECTION_KEY];
  }
  for (const key of PUBLIC_PAGE_SECTION_KEYS) {
    if (typeof record[key] === "boolean") next[key] = record[key];
  }
  return next;
}

export function toPublicPageSectionsJson(state: PublicPageSectionsState): Record<string, boolean> {
  return { ...state };
}
