import { describe, expect, it } from "vitest";
import {
  getPublicClubReturnContext,
  resolveDashboardClubPageLink,
  setPublicClubReturnContext,
  clearPublicClubReturnContext,
  PUBLIC_CLUB_RETURN_STORAGE_KEY,
} from "@/lib/public-club-return";

describe("public-club-return", () => {
  it("stores and reads return context from sessionStorage", () => {
    sessionStorage.clear();
    setPublicClubReturnContext({
      slug: "tsv-allach-09",
      name: "TSV Allach 09",
      path: "/club/tsv-allach-09?invite=abc",
    });

    expect(getPublicClubReturnContext()).toEqual({
      slug: "tsv-allach-09",
      name: "TSV Allach 09",
      path: "/club/tsv-allach-09?invite=abc",
    });

    clearPublicClubReturnContext();
    expect(sessionStorage.getItem(PUBLIC_CLUB_RETURN_STORAGE_KEY)).toBeNull();
  });

  it("prefers active club membership over session return context", () => {
    const link = resolveDashboardClubPageLink({
      activeClubSlug: "member-club",
      activeClubName: "Member Club",
      returnContext: {
        slug: "tsv-allach-09",
        name: "TSV Allach 09",
        path: "/club/tsv-allach-09",
      },
    });

    expect(link).toEqual({
      href: "/club/member-club",
      name: "Member Club",
    });
  });

  it("falls back to session return context without membership", () => {
    const link = resolveDashboardClubPageLink({
      activeClubSlug: null,
      activeClubName: null,
      returnContext: {
        slug: "tsv-allach-09",
        name: "TSV Allach 09",
        path: "/club/tsv-allach-09",
      },
    });

    expect(link).toEqual({
      href: "/club/tsv-allach-09",
      name: "TSV Allach 09",
    });
  });
});
