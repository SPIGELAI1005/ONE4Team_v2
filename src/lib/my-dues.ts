export interface OpenDueRow {
  id: string;
  membershipId: string;
  dueDate: string;
  amountCents: number | null;
  currency: string;
  status: string;
  note: string | null;
  wardLabel?: string;
  pendingClaim?: boolean;
}

export function collectMembershipIdsForDuesView(input: {
  membershipId: string;
  role: string;
  wardMembershipIds: string[];
}): string[] {
  const ids = [input.membershipId];
  if (input.role === "parent_supporter") {
    for (const wardId of input.wardMembershipIds) {
      if (!ids.includes(wardId)) ids.push(wardId);
    }
  }
  return ids;
}

export function mapOpenDuesWithClaims(
  dues: OpenDueRow[],
  pendingDueIds: Set<string>,
  wardNames: Map<string, string>,
): OpenDueRow[] {
  return dues.map((due) => ({
    ...due,
    wardLabel: wardNames.get(due.membershipId),
    pendingClaim: pendingDueIds.has(due.id),
  }));
}

export function formatDueAmount(amountCents: number | null, currency: string, locale: "en" | "de"): string {
  if (amountCents == null) return locale === "de" ? "Offen" : "Open";
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amountCents / 100);
}

export function canMemberClaimDue(due: OpenDueRow): boolean {
  return due.status === "due" && !due.pendingClaim;
}
