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

export function normalizeContactEmail(email: string): string {
  return email.trim().toLowerCase();
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

/** Stable identity for drafts/imports when club member numbers are available. */
export function memberRegistryIdentityKey(
  email: string,
  memberNumber?: string | null,
  personLabel?: string | null,
): string {
  const num = memberNumber?.trim();
  if (num) return `num:${num}`;
  const normalized = normalizeContactEmail(email);
  const label = (personLabel ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized && label) return `person:${normalized}:${label}`;
  return normalized ? `email:${normalized}` : "";
}

export function formatSharedContactGroupLabel(count: number, email: string): string {
  return `${count} · ${email}`;
}
