import { normalizeContactEmail } from "@/lib/member-shared-contact-email";

export type MemberDuplicateReviewSource = "roster" | "draft";

export type MemberDuplicateReviewReason =
  | "duplicate_club_number"
  | "duplicate_name_and_email"
  | "roster_and_draft_overlap";

export interface MemberDuplicateReviewEntry {
  id: string;
  source: MemberDuplicateReviewSource;
  email: string;
  name: string;
  memberNumber?: string | null;
}

export interface MemberDuplicateReviewRelated {
  id: string;
  source: MemberDuplicateReviewSource;
  name: string;
  memberNumber?: string | null;
}

export interface MemberDuplicateReviewFlag {
  reasons: MemberDuplicateReviewReason[];
  related: MemberDuplicateReviewRelated[];
  needsReview: true;
}

function entryKey(source: MemberDuplicateReviewSource, id: string): string {
  return `${source}:${id}`;
}

function normalizePersonName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Auto-generated placeholder numbers are not stable club identifiers. */
export function isPlaceholderClubMemberNumber(memberNumber: string | null | undefined): boolean {
  return /^O4T-/i.test((memberNumber ?? "").trim());
}

function mergeFlag(
  map: Map<string, MemberDuplicateReviewFlag>,
  entry: MemberDuplicateReviewEntry,
  reason: MemberDuplicateReviewReason,
  group: MemberDuplicateReviewEntry[],
): void {
  const key = entryKey(entry.source, entry.id);
  const existing =
    map.get(key) ??
    ({
      reasons: [],
      related: [],
      needsReview: true as const,
    } satisfies MemberDuplicateReviewFlag);

  if (!existing.reasons.includes(reason)) {
    existing.reasons.push(reason);
  }

  for (const other of group) {
    if (other.id === entry.id && other.source === entry.source) continue;
    const related: MemberDuplicateReviewRelated = {
      id: other.id,
      source: other.source,
      name: other.name,
      memberNumber: other.memberNumber,
    };
    if (!existing.related.some((item) => item.id === related.id && item.source === related.source)) {
      existing.related.push(related);
    }
  }

  map.set(key, existing);
}

/** Detect roster / saved-list entries that likely duplicate each other after import. */
export function buildMemberDuplicateReviewMap(
  entries: MemberDuplicateReviewEntry[],
): Map<string, MemberDuplicateReviewFlag> {
  const result = new Map<string, MemberDuplicateReviewFlag>();

  const byClubNumber = new Map<string, MemberDuplicateReviewEntry[]>();
  for (const entry of entries) {
    const num = entry.memberNumber?.trim();
    if (!num || isPlaceholderClubMemberNumber(num)) continue;
    const list = byClubNumber.get(num) ?? [];
    list.push(entry);
    byClubNumber.set(num, list);
  }

  const byEmailAndName = new Map<string, MemberDuplicateReviewEntry[]>();
  for (const entry of entries) {
    const email = normalizeContactEmail(entry.email);
    const name = normalizePersonName(entry.name);
    if (!email || !name) continue;
    const key = `${email}::${name}`;
    const list = byEmailAndName.get(key) ?? [];
    list.push(entry);
    byEmailAndName.set(key, list);
  }

  for (const group of byClubNumber.values()) {
    if (group.length < 2) continue;
    const hasRoster = group.some((entry) => entry.source === "roster");
    const hasDraft = group.some((entry) => entry.source === "draft");
    for (const entry of group) {
      mergeFlag(result, entry, "duplicate_club_number", group);
      if (hasRoster && hasDraft) {
        mergeFlag(result, entry, "roster_and_draft_overlap", group);
      }
    }
  }

  for (const group of byEmailAndName.values()) {
    if (group.length < 2) continue;
    for (const entry of group) {
      mergeFlag(result, entry, "duplicate_name_and_email", group);
    }
  }

  return result;
}

export function getMemberDuplicateReview(
  map: Map<string, MemberDuplicateReviewFlag>,
  source: MemberDuplicateReviewSource,
  id: string,
): MemberDuplicateReviewFlag | undefined {
  return map.get(entryKey(source, id));
}

export function memberNeedsDuplicateReview(
  map: Map<string, MemberDuplicateReviewFlag>,
  source: MemberDuplicateReviewSource,
  id: string,
): boolean {
  return Boolean(getMemberDuplicateReview(map, source, id));
}

export function countMemberDuplicateReviewEntries(map: Map<string, MemberDuplicateReviewFlag>): number {
  return map.size;
}

function draftRetentionScore(entry: MemberDuplicateReviewEntry): number {
  const num = entry.memberNumber?.trim() ?? "";
  let score = 0;
  if (num && !isPlaceholderClubMemberNumber(num)) score += 100;
  if (normalizeContactEmail(entry.email)) score += 10;
  if (entry.name.trim()) score += 1;
  return score;
}

export interface DuplicateDraftRemovalPlan {
  draftIdsToRemove: string[];
  protectedDraftIds: string[];
}

/** Choose saved-list drafts to delete when they duplicate roster members or each other. */
export function planDuplicateDraftRemovals(
  entries: MemberDuplicateReviewEntry[],
  options?: { protectedDraftIds?: ReadonlySet<string> },
): DuplicateDraftRemovalPlan {
  const protectedDraftIds = new Set(options?.protectedDraftIds ?? []);
  const drafts = entries.filter((entry) => entry.source === "draft");
  const roster = entries.filter((entry) => entry.source === "roster");
  const remove = new Set<string>();

  for (const draft of drafts) {
    const clubNumber = draft.memberNumber?.trim();
    if (clubNumber && !isPlaceholderClubMemberNumber(clubNumber)) {
      const rosterMatch = roster.some((member) => member.memberNumber?.trim() === clubNumber);
      if (rosterMatch) {
        remove.add(draft.id);
        continue;
      }
    }

    const email = normalizeContactEmail(draft.email);
    const name = normalizePersonName(draft.name);
    if (email && name) {
      const rosterMatch = roster.some(
        (member) =>
          normalizeContactEmail(member.email) === email && normalizePersonName(member.name) === name,
      );
      if (rosterMatch) remove.add(draft.id);
    }
  }

  const remainingDrafts = drafts.filter((draft) => !remove.has(draft.id));

  const groupAndRemoveExtras = (groups: Iterable<MemberDuplicateReviewEntry[]>) => {
    for (const group of groups) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => draftRetentionScore(b) - draftRetentionScore(a));
      for (let index = 1; index < sorted.length; index += 1) {
        remove.add(sorted[index].id);
      }
    }
  };

  const byClubNumber = new Map<string, MemberDuplicateReviewEntry[]>();
  for (const draft of remainingDrafts) {
    const clubNumber = draft.memberNumber?.trim();
    if (!clubNumber || isPlaceholderClubMemberNumber(clubNumber)) continue;
    const list = byClubNumber.get(clubNumber) ?? [];
    list.push(draft);
    byClubNumber.set(clubNumber, list);
  }
  groupAndRemoveExtras(byClubNumber.values());

  const stillRemaining = remainingDrafts.filter((draft) => !remove.has(draft.id));
  const byEmailAndName = new Map<string, MemberDuplicateReviewEntry[]>();
  for (const draft of stillRemaining) {
    const email = normalizeContactEmail(draft.email);
    const name = normalizePersonName(draft.name);
    if (!email || !name) continue;
    const key = `${email}::${name}`;
    const list = byEmailAndName.get(key) ?? [];
    list.push(draft);
    byEmailAndName.set(key, list);
  }
  groupAndRemoveExtras(byEmailAndName.values());

  const draftIdsToRemove: string[] = [];
  for (const draftId of remove) {
    if (protectedDraftIds.has(draftId)) continue;
    draftIdsToRemove.push(draftId);
  }

  return {
    draftIdsToRemove,
    protectedDraftIds: [...protectedDraftIds].filter((draftId) => remove.has(draftId)),
  };
}

export function countDuplicateDraftsScheduledForRemoval(plan: DuplicateDraftRemovalPlan): number {
  return plan.draftIdsToRemove.length;
}
