/**
 * Resolve registry import rows to roster memberships or saved drafts.
 * Club member numbers are the primary key; contact email is not unique (households).
 */

export type RegistryImportMatchKind =
  | "club_number_roster"
  | "email_roster"
  | "club_number_draft"
  | "email_draft"
  | "none";

export interface RegistryImportMatchInput {
  clubNumber: string;
  email: string;
  importFirstName?: string | null;
  importLastName?: string | null;
  membershipByClubNumber: Map<string, string>;
  emailToMembership: Map<string, string>;
  draftByClubNumber: Map<string, { id: string; name: string | null }>;
  emailToDraft: Map<string, { id: string; name: string | null }>;
  rosterMasterByMembershipId?: Map<
    string,
    { firstName?: string | null; lastName?: string | null; displayName?: string | null }
  >;
}

export interface RegistryImportMatchResult {
  membershipId: string | null;
  draftId: string | null;
  draftName: string | null;
  matchKind: RegistryImportMatchKind;
  rejectedNameMismatch?: boolean;
}

function normalizePersonName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Reject club-number matches when first/last name clearly refers to a different person. */
export function registryImportNamesCompatible(
  importFirstName: string | null | undefined,
  importLastName: string | null | undefined,
  existing: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    draftName?: string | null;
  },
): boolean {
  const importFirst = normalizePersonName(importFirstName);
  const importLast = normalizePersonName(importLastName);
  if (!importFirst && !importLast) return true;

  const existingFirst = normalizePersonName(existing.firstName);
  const existingLast = normalizePersonName(existing.lastName);
  const existingDisplay = normalizePersonName(existing.displayName || existing.draftName);
  const importFull = [importFirst, importLast].filter(Boolean).join(" ");

  if (importLast && existingLast && importLast !== existingLast) return false;

  if (importFirst && existingFirst && importFirst !== existingFirst) {
    if (existingDisplay.includes(importFull) || existingDisplay.includes(importFirst)) return true;
    return false;
  }

  if (importFirst && !existingFirst && existingDisplay) {
    if (existingDisplay.includes(importFull) || existingDisplay.includes(importFirst)) return true;
    if (importLast && existingDisplay.includes(importLast)) return false;
    return false;
  }

  return true;
}

export function resolveRegistryImportMatch(input: RegistryImportMatchInput): RegistryImportMatchResult {
  const clubNumber = input.clubNumber.trim();
  const email = input.email.trim().toLowerCase();

  if (clubNumber) {
    const rosterId = input.membershipByClubNumber.get(clubNumber) ?? null;
    if (rosterId) {
      const rosterMeta = input.rosterMasterByMembershipId?.get(rosterId);
      if (
        rosterMeta &&
        !registryImportNamesCompatible(input.importFirstName, input.importLastName, {
          firstName: rosterMeta.firstName,
          lastName: rosterMeta.lastName,
          displayName: rosterMeta.displayName,
        })
      ) {
        return {
          membershipId: null,
          draftId: null,
          draftName: null,
          matchKind: "none",
          rejectedNameMismatch: true,
        };
      }
      return { membershipId: rosterId, draftId: null, draftName: null, matchKind: "club_number_roster" };
    }

    const draftMatch = input.draftByClubNumber.get(clubNumber) ?? null;
    if (draftMatch) {
      if (
        !registryImportNamesCompatible(input.importFirstName, input.importLastName, {
          draftName: draftMatch.name,
        })
      ) {
        return {
          membershipId: null,
          draftId: null,
          draftName: null,
          matchKind: "none",
          rejectedNameMismatch: true,
        };
      }
      return {
        membershipId: null,
        draftId: draftMatch.id,
        draftName: draftMatch.name,
        matchKind: "club_number_draft",
      };
    }

    return { membershipId: null, draftId: null, draftName: null, matchKind: "none" };
  }

  if (email) {
    const rosterId = input.emailToMembership.get(email) ?? null;
    if (rosterId) {
      return { membershipId: rosterId, draftId: null, draftName: null, matchKind: "email_roster" };
    }

    const draftMatch = input.emailToDraft.get(email) ?? null;
    if (draftMatch) {
      return {
        membershipId: null,
        draftId: draftMatch.id,
        draftName: draftMatch.name,
        matchKind: "email_draft",
      };
    }
  }

  return { membershipId: null, draftId: null, draftName: null, matchKind: "none" };
}
