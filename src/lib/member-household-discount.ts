/**
 * Family / household discount eligibility from shared contact email + surname + address.
 */

import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { normalizeContactEmail } from "@/lib/member-shared-contact-email";

export type HouseholdDiscountStatus = "pending_verification" | "verified" | "rejected";

export interface HouseholdDiscountMemberRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  streetLine: string;
  postalCode: string;
  city: string;
  memberNumber?: string | null;
  membershipId?: string | null;
  draftId?: string | null;
}

export interface HouseholdDiscountGroup {
  groupId: string;
  email: string;
  lastName: string;
  addressKey: string;
  addressLabel: string;
  members: HouseholdDiscountMemberRef[];
  eligibleForFamilyDiscount: boolean;
  status: HouseholdDiscountStatus | "incomplete";
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildAddressKey(parts: {
  streetLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): string {
  const street = normalizeName(parts.streetLine || "");
  const postal = normalizeName(parts.postalCode || "").replace(/\s/g, "");
  const city = normalizeName(parts.city || "");
  if (!postal && !city) return "";
  return [street, postal, city].filter(Boolean).join("|");
}

export function formatAddressLabel(parts: {
  streetLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): string {
  return [parts.streetLine?.trim(), [parts.postalCode?.trim(), parts.city?.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

function buildGroupId(email: string, lastName: string, addressKey: string): string {
  return `hh:${normalizeContactEmail(email)}:${normalizeName(lastName)}:${addressKey}`;
}

export function householdRefFromMasterLike(
  id: string,
  email: string,
  master: Partial<ClubMemberMasterRecord>,
  extras?: { membershipId?: string | null; draftId?: string | null },
): HouseholdDiscountMemberRef {
  return {
    id,
    email: email.trim(),
    firstName: master.first_name?.trim() || "",
    lastName: master.last_name?.trim() || "",
    streetLine: master.street_line?.trim() || "",
    postalCode: master.postal_code?.trim() || "",
    city: master.city?.trim() || "",
    memberNumber: master.internal_club_number?.trim() || null,
    membershipId: extras?.membershipId ?? null,
    draftId: extras?.draftId ?? null,
  };
}

export function buildHouseholdDiscountGroups(members: HouseholdDiscountMemberRef[]): HouseholdDiscountGroup[] {
  const byEmail = new Map<string, HouseholdDiscountMemberRef[]>();
  for (const member of members) {
    const email = normalizeContactEmail(member.email);
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(member);
    byEmail.set(email, list);
  }

  const groups: HouseholdDiscountGroup[] = [];

  for (const [email, emailMembers] of byEmail.entries()) {
    if (emailMembers.length < 2) continue;

    const byFamilyAddress = new Map<string, HouseholdDiscountMemberRef[]>();
    for (const member of emailMembers) {
      const lastName = normalizeName(member.lastName);
      if (!lastName) continue;
      const addressKey = buildAddressKey(member);
      const bucketKey = `${lastName}::${addressKey || "__no_address__"}`;
      const list = byFamilyAddress.get(bucketKey) ?? [];
      list.push(member);
      byFamilyAddress.set(bucketKey, list);
    }

    for (const [bucketKey, bucketMembers] of byFamilyAddress.entries()) {
      if (bucketMembers.length < 2) continue;
      const lastName = bucketMembers[0]?.lastName.trim() || "";
      const addressKey = buildAddressKey(bucketMembers[0] || {});
      const sameLastName = bucketMembers.every((m) => normalizeName(m.lastName) === normalizeName(lastName));
      const addressComplete = Boolean(addressKey);
      const sameAddress =
        addressComplete &&
        bucketMembers.every((m) => buildAddressKey(m) === addressKey);

      const eligible = sameLastName && sameAddress;
      const groupId = buildGroupId(email, lastName, addressKey || bucketKey);

      groups.push({
        groupId,
        email,
        lastName,
        addressKey,
        addressLabel: formatAddressLabel(bucketMembers[0] || {}) || "—",
        members: bucketMembers,
        eligibleForFamilyDiscount: eligible,
        status: eligible ? "pending_verification" : "incomplete",
      });
    }
  }

  return groups;
}

export function findHouseholdGroupForMember(
  groups: HouseholdDiscountGroup[],
  member: Pick<HouseholdDiscountMemberRef, "email" | "lastName" | "streetLine" | "postalCode" | "city">,
): HouseholdDiscountGroup | undefined {
  const email = normalizeContactEmail(member.email);
  if (!email) return undefined;
  const lastName = normalizeName(member.lastName);
  const addressKey = buildAddressKey(member);
  return groups.find(
    (group) =>
      normalizeContactEmail(group.email) === email &&
      normalizeName(group.lastName) === lastName &&
      (group.addressKey ? group.addressKey === addressKey : group.members.length >= 2),
  );
}

export function stampHouseholdDiscountOnMaster(
  master: Partial<ClubMemberMasterRecord>,
  group: HouseholdDiscountGroup | undefined,
): Partial<ClubMemberMasterRecord> {
  if (!group?.eligibleForFamilyDiscount) return master;
  const existingStatus = master.household_discount_status;
  if (existingStatus === "verified" || existingStatus === "rejected") {
    return { ...master, household_discount_group_id: group.groupId };
  }
  return {
    ...master,
    household_discount_group_id: group.groupId,
    household_discount_status: "pending_verification",
  };
}

export function annotateRowsWithHouseholdDiscount<T extends { id: string; email: string; masterData: Partial<ClubMemberMasterRecord> }>(
  rows: T[],
): { groups: HouseholdDiscountGroup[]; rows: T[] } {
  const refs = rows.map((row) =>
    householdRefFromMasterLike(row.id, row.email, row.masterData),
  );
  const groups = buildHouseholdDiscountGroups(refs);
  const nextRows = rows.map((row) => {
    const ref = householdRefFromMasterLike(row.id, row.email, row.masterData);
    const group = findHouseholdGroupForMember(groups, ref);
    return {
      ...row,
      masterData: stampHouseholdDiscountOnMaster(row.masterData, group),
    };
  });
  return { groups, rows: nextRows };
}

export function countPendingHouseholdGroups(
  groups: HouseholdDiscountGroup[],
  masters: Array<Partial<ClubMemberMasterRecord>>,
): number {
  const pendingGroupIds = new Set(
    masters
      .filter((m) => m.household_discount_status === "pending_verification" && m.household_discount_group_id)
      .map((m) => String(m.household_discount_group_id)),
  );
  return groups.filter((g) => g.eligibleForFamilyDiscount && pendingGroupIds.has(g.groupId)).length;
}
