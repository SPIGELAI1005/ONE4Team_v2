import { describe, expect, it } from "vitest";
import {
  buildMemberDuplicateReviewMap,
  getMemberDuplicateReview,
  isPlaceholderClubMemberNumber,
  planDuplicateDraftRemovals,
} from "@/lib/member-duplicate-review";

describe("member-duplicate-review", () => {
  it("flags same club number on roster and saved draft", () => {
    const map = buildMemberDuplicateReviewMap([
      {
        id: "m1",
        source: "roster",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "11281",
      },
      {
        id: "d1",
        source: "draft",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "11281",
      },
    ]);

    expect(getMemberDuplicateReview(map, "roster", "m1")?.reasons).toContain("duplicate_club_number");
    expect(getMemberDuplicateReview(map, "roster", "m1")?.reasons).toContain("roster_and_draft_overlap");
    expect(getMemberDuplicateReview(map, "draft", "d1")?.related).toHaveLength(1);
  });

  it("flags same name and email even when one entry uses a placeholder club number", () => {
    const map = buildMemberDuplicateReviewMap([
      {
        id: "m1",
        source: "roster",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "11281",
      },
      {
        id: "d2",
        source: "draft",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "O4T-WGIRY8F9",
      },
    ]);

    expect(getMemberDuplicateReview(map, "draft", "d2")?.reasons).toContain("duplicate_name_and_email");
    expect(isPlaceholderClubMemberNumber("O4T-WGIRY8F9")).toBe(true);
  });

  it("does not flag siblings on a shared family email", () => {
    const map = buildMemberDuplicateReviewMap([
      {
        id: "d1",
        source: "draft",
        email: "family@gmx.de",
        name: "Anna Fries",
        memberNumber: "11001",
      },
      {
        id: "d2",
        source: "draft",
        email: "family@gmx.de",
        name: "Uli Fries",
        memberNumber: "11002",
      },
    ]);

    expect(map.size).toBe(0);
  });
});

describe("planDuplicateDraftRemovals", () => {
  it("removes drafts that duplicate an active roster member", () => {
    const plan = planDuplicateDraftRemovals([
      {
        id: "m1",
        source: "roster",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "11281",
      },
      {
        id: "d1",
        source: "draft",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "11281",
      },
      {
        id: "d2",
        source: "draft",
        email: "george.neacsu@gmx.de",
        name: "Alexander Neacsu",
        memberNumber: "O4T-WGIRY8F9",
      },
    ]);

    expect(plan.draftIdsToRemove.sort()).toEqual(["d1", "d2"]);
  });

  it("keeps the strongest draft when only saved-list duplicates remain", () => {
    const plan = planDuplicateDraftRemovals([
      {
        id: "d1",
        source: "draft",
        email: "family@gmx.de",
        name: "Anna Fries",
        memberNumber: "11001",
      },
      {
        id: "d2",
        source: "draft",
        email: "family@gmx.de",
        name: "Anna Fries",
        memberNumber: "O4T-ABC123",
      },
    ]);

    expect(plan.draftIdsToRemove).toEqual(["d2"]);
  });

  it("skips protected invited drafts", () => {
    const plan = planDuplicateDraftRemovals(
      [
        {
          id: "m1",
          source: "roster",
          email: "a@b.com",
          name: "Alex Neacsu",
          memberNumber: "11281",
        },
        {
          id: "d1",
          source: "draft",
          email: "a@b.com",
          name: "Alex Neacsu",
          memberNumber: "11281",
        },
      ],
      { protectedDraftIds: new Set(["d1"]) },
    );

    expect(plan.draftIdsToRemove).toEqual([]);
    expect(plan.protectedDraftIds).toEqual(["d1"]);
  });
});
