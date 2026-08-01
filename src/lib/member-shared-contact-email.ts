/**
 * Household / guardian contact emails shared by multiple club members.
 * Distinct from app login email (auth.users) — used for billing and correspondence.
 */

export type SharedContactEmailSource = "roster" | "draft" | "import";

export interface SharedContactEmailMember {
  id: string;
  name: string;
  memberNumber?: string | null;
  source: SharedContactEmailSource;
}

export interface SharedContactEmailGroup {
  email: string;
  members: SharedContactEmailMember[];
}

export function normalizeContactEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function buildSharedContactEmailGroups(
  entries: Array<{
    id: string;
    email: string;
    name: string;
    memberNumber?: string | null;
    source: SharedContactEmailSource;
  }>,
): Map<string, SharedContactEmailGroup> {
  const groups = new Map<string, SharedContactEmailMember[]>();

  for (const entry of entries) {
    const email = normalizeContactEmail(entry.email);
    if (!email) continue;
    const list = groups.get(email) ?? [];
    list.push({
      id: entry.id,
      name: entry.name.trim() || email,
      memberNumber: entry.memberNumber?.trim() || null,
      source: entry.source,
    });
    groups.set(email, list);
  }

  const result = new Map<string, SharedContactEmailGroup>();
  for (const [email, members] of groups.entries()) {
    if (members.length < 2) continue;
    result.set(email, { email, members });
  }
  return result;
}

export function getSharedContactGroup(
  groups: Map<string, SharedContactEmailGroup>,
  email: string,
): SharedContactEmailGroup | undefined {
  return groups.get(normalizeContactEmail(email));
}

export function sharedContactGroupSize(groups: Map<string, SharedContactEmailGroup>, email: string): number {
  return getSharedContactGroup(groups, email)?.members.length ?? 0;
}

export function isSharedContactEmail(groups: Map<string, SharedContactEmailGroup>, email: string): boolean {
  return sharedContactGroupSize(groups, email) > 1;
}

function normalizePersonLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable identity for drafts/imports when club member numbers are available. */
export function memberRegistryIdentityKey(
  email: string,
  memberNumber?: string | null,
  personLabel?: string | null,
): string {
  const num = memberNumber?.trim();
  if (num) return `num:${num}`;
  const normalized = normalizeContactEmail(email);
  const label = normalizePersonLabel(personLabel ?? "");
  if (normalized && label) return `person:${normalized}:${label}`;
  if (normalized) return `email:${normalized}`;
  if (label) return `name:${label}`;
  return "";
}

/** Pick a non-colliding identity when adding an unmatched registry row to saved list. */
export function resolveNewDraftIdentityKey(
  email: string,
  memberNumber: string | null | undefined,
  displayName: string,
  existingKeys: Set<string>,
  options?: { clubNumberConflict?: boolean },
): string | null {
  const normalized = normalizeContactEmail(email);
  const num = memberNumber?.trim() ?? "";
  const numKey = num ? `num:${num}` : "";
  const label = normalizePersonLabel(displayName);
  const personKey = normalized && label ? `person:${normalized}:${label}` : "";
  const nameKey = label ? `name:${label}` : "";
  const numTaken = numKey ? existingKeys.has(numKey) : false;
  const forcePerson = Boolean(options?.clubNumberConflict || numTaken);

  if (!forcePerson && numKey && !numTaken) return numKey;
  if (personKey && !existingKeys.has(personKey)) return personKey;
  if (nameKey && !existingKeys.has(nameKey)) return nameKey;
  return null;
}

export function collectDraftIdentityKeys(
  email: string,
  memberNumber: string | null | undefined,
  displayName: string,
): string[] {
  const keys = new Set<string>();
  const numKey = memberRegistryIdentityKey(email, memberNumber, null);
  const personKey = memberRegistryIdentityKey(email, null, displayName);
  const nameKey = memberRegistryIdentityKey("", null, displayName);
  if (numKey) keys.add(numKey);
  if (personKey) keys.add(personKey);
  if (nameKey) keys.add(nameKey);
  return [...keys];
}

export function registryImportRowLinkKey(
  email: string,
  displayName: string,
  memberNumber?: string | null,
): string {
  const label = normalizePersonLabel(displayName);
  const normalizedEmail = normalizeContactEmail(email);
  if (normalizedEmail) return `${normalizedEmail}::${label}`;
  const num = memberNumber?.trim();
  if (num) return `num:${num}::${label}`;
  return `name:${label}`;
}

export function formatSharedContactGroupLabel(count: number, email: string): string {
  return `${count} · ${email}`;
}
