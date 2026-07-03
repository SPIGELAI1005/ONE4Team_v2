/** Session-scoped public club the user browsed before opening the dashboard. */

export const PUBLIC_CLUB_RETURN_STORAGE_KEY = "one4team.publicClubReturn";

export interface PublicClubReturnContext {
  slug: string;
  name: string;
  /** Full return path including query (e.g. `/club/tsv-allach-09?draft=1`). */
  path: string;
}

function isPublicClubReturnContext(value: unknown): value is PublicClubReturnContext {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.slug === "string" &&
    row.slug.trim().length > 0 &&
    typeof row.name === "string" &&
    typeof row.path === "string" &&
    row.path.startsWith("/club/")
  );
}

export function setPublicClubReturnContext(context: PublicClubReturnContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PUBLIC_CLUB_RETURN_STORAGE_KEY, JSON.stringify(context));
}

export function getPublicClubReturnContext(): PublicClubReturnContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PUBLIC_CLUB_RETURN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPublicClubReturnContext(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPublicClubReturnContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PUBLIC_CLUB_RETURN_STORAGE_KEY);
}

export interface DashboardClubPageLink {
  href: string;
  name: string;
}

/** Prefer active membership club; fall back to browsed public club this session. */
export function resolveDashboardClubPageLink(options: {
  activeClubSlug?: string | null;
  activeClubName?: string | null;
  returnContext?: PublicClubReturnContext | null;
}): DashboardClubPageLink | null {
  const { activeClubSlug, activeClubName, returnContext } = options;

  if (activeClubSlug) {
    return {
      href: `/club/${encodeURIComponent(activeClubSlug)}`,
      name: activeClubName?.trim() || activeClubSlug,
    };
  }

  if (returnContext?.slug) {
    return {
      href: returnContext.path,
      name: returnContext.name.trim() || returnContext.slug,
    };
  }

  return null;
}
