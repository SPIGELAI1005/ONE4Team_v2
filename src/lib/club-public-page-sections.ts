export const PUBLIC_PAGE_SECTION_KEYS = [
  "about",
  "news",
  "teams",
  "shop",
  "media",
  "schedule",
  "events",
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
  contact: true,
};

export function parsePublicPageSections(raw: unknown): PublicPageSectionsState {
  const next = { ...DEFAULT_PUBLIC_PAGE_SECTIONS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return next;
  const record = raw as Record<string, unknown>;
  for (const key of PUBLIC_PAGE_SECTION_KEYS) {
    if (typeof record[key] === "boolean") next[key] = record[key];
  }
  return next;
}

export function toPublicPageSectionsJson(state: PublicPageSectionsState): Record<string, boolean> {
  return { ...state };
}
