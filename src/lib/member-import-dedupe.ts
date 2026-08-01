import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { memberRegistryIdentityKey } from "@/lib/member-shared-contact-email";

export interface BulkImportRowLike {
  id: string;
  email: string;
  name: string;
  role: string;
  team: string;
  ageGroup: string;
  position: string;
  masterData: Partial<ClubMemberMasterRecord>;
}

export interface MergeBulkImportResult<T extends BulkImportRowLike> {
  rows: T[];
  added: number;
  updated: number;
  skipped: number;
}

export function bulkImportIdentityKey(row: BulkImportRowLike): string {
  const fromMaster = memberRegistryIdentityKey(
    row.email,
    row.masterData.internal_club_number,
    row.name.trim() || undefined,
  );
  if (fromMaster) return fromMaster;
  const name = row.name.trim().toLowerCase();
  if (name) return `name:${name}`;
  return `id:${row.id}`;
}

/** Merge incoming import rows into existing bulk rows without creating duplicates. */
export function mergeBulkImportRows<T extends BulkImportRowLike>(
  existing: T[],
  incoming: T[],
): MergeBulkImportResult<T> {
  const byKey = new Map<string, T>();
  for (const row of existing) {
    byKey.set(bulkImportIdentityKey(row), row);
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of incoming) {
    const key = bulkImportIdentityKey(row);
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, row);
      added += 1;
      continue;
    }

    const sameContent =
      normalizeEmail(previous.email) === normalizeEmail(row.email) &&
      previous.name.trim() === row.name.trim() &&
      previous.role === row.role &&
      previous.team.trim() === row.team.trim() &&
      JSON.stringify(previous.masterData) === JSON.stringify(row.masterData);

    if (sameContent) {
      skipped += 1;
      continue;
    }

    byKey.set(key, {
      ...previous,
      ...row,
      id: previous.id,
      include: previous.include,
      masterData: { ...previous.masterData, ...row.masterData },
    });
    updated += 1;
  }

  return { rows: Array.from(byKey.values()), added, updated, skipped };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const PREVIEW_MASTER_KEYS: Array<keyof ClubMemberMasterRecord> = [
  "internal_club_number",
  "first_name",
  "last_name",
  "birth_date",
  "sex",
  "city",
  "postal_code",
  "street_line",
  "club_registration_date",
  "membership_kind",
];

export function registryImportRowDisplayName(payload: Partial<ClubMemberMasterRecord>, fallbackEmail = ""): string {
  const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  return (fallbackEmail ?? "").trim();
}

export function canAddRegistryRowToSavedList(input: {
  membershipId?: string | null;
  draftId?: string | null;
  email?: string;
  payload: Partial<ClubMemberMasterRecord>;
}): boolean {
  if (input.membershipId || input.draftId) return false;
  if (normalizeEmail(input.email ?? "")) return true;
  if (input.payload.internal_club_number?.trim()) return true;
  return Boolean(registryImportRowDisplayName(input.payload, input.email ?? "").trim());
}

export function summarizeMasterPayloadForDisplay(payload: Partial<ClubMemberMasterRecord>): string {
  const parts: string[] = [];
  for (const key of PREVIEW_MASTER_KEYS) {
    const value = payload[key];
    if (value === null || value === undefined || String(value).trim() === "") continue;
    if (key === "internal_club_number") {
      parts.push(`#${String(value).trim()}`);
      continue;
    }
    parts.push(String(value).trim());
  }
  return parts.join(" · ");
}
