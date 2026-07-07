import { isErrorWithMessage } from "@/types/dashboard";

function rawErrorMessage(err: unknown): string {
  if (isErrorWithMessage(err)) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

/** Lowercase URL slug from a club display name (matches create_club_with_admin client input). */
export function slugifyClubName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function resolveClubSlug(name: string, nowMs = Date.now()): string {
  const slug = slugifyClubName(name);
  return slug || `club-${nowMs}`;
}

export function parseRegistrationSummary(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore malformed localStorage payload */
  }
  return null;
}

export interface CreateClubRpcPayload {
  _name: string;
  _slug: string;
  _description: string | null;
  _is_public: boolean;
  _plan_id: string;
  _metadata: Record<string, unknown>;
}

export function buildCreateClubRpcPayload(input: {
  clubName: string;
  clubDescription: string;
  planParam: string | null;
  registrationSummary: string | null;
  nowMs?: number;
}): CreateClubRpcPayload {
  const trimmedName = input.clubName.trim();
  const registration = parseRegistrationSummary(input.registrationSummary);
  const metadata: Record<string, unknown> = { source: "onboarding", ...registration };

  return {
    _name: trimmedName,
    _slug: resolveClubSlug(trimmedName, input.nowMs),
    _description: input.clubDescription.trim() || null,
    _is_public: true,
    _plan_id: input.planParam?.trim() || "kickoff",
    _metadata: metadata,
  };
}

export interface CreateClubErrorLabels {
  unknown: string;
  notAuthenticated: string;
  duplicateSlug: string;
  provisioningConflict: string;
}

/**
 * Maps PostgREST / Postgres errors from create_club_with_admin to user-facing copy.
 * See migration 20260707190000 (duplicate club_role_assignments insert removed).
 */
export function getCreateClubErrorMessage(err: unknown, labels: CreateClubErrorLabels): string {
  const raw = rawErrorMessage(err);
  const normalized = raw.toLowerCase();

  if (normalized.includes("not authenticated")) return labels.notAuthenticated;
  if (
    normalized.includes("idx_club_role_assignments_unique") ||
    (normalized.includes("duplicate key") && normalized.includes("club_role_assignments"))
  ) {
    return labels.provisioningConflict;
  }
  if (
    normalized.includes("duplicate key") &&
    (normalized.includes("slug") || normalized.includes("clubs"))
  ) {
    return labels.duplicateSlug;
  }

  return raw.trim() || labels.unknown;
}
