import { describe, expect, it } from "vitest";
import {
  buildCreateClubRpcPayload,
  getCreateClubErrorMessage,
  parseRegistrationSummary,
  resolveClubSlug,
  slugifyClubName,
} from "@/lib/onboarding-club";

const errorLabels = {
  unknown: "unknown",
  notAuthenticated: "not-auth",
  duplicateSlug: "duplicate-slug",
  provisioningConflict: "provisioning-conflict",
};

describe("slugifyClubName", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugifyClubName("FC Steve Tack")).toBe("fc-steve-tack");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyClubName("  --My Club--  ")).toBe("my-club");
  });

  it("returns empty string for symbols-only names", () => {
    expect(slugifyClubName("!!!")).toBe("");
  });
});

describe("resolveClubSlug", () => {
  it("falls back to timestamped slug when name slugifies to empty", () => {
    expect(resolveClubSlug("!!!", 1_700_000_000_000)).toBe("club-1700000000000");
  });
});

describe("parseRegistrationSummary", () => {
  it("returns null for missing or invalid JSON", () => {
    expect(parseRegistrationSummary(null)).toBeNull();
    expect(parseRegistrationSummary("{not-json")).toBeNull();
    expect(parseRegistrationSummary("[]")).toBeNull();
  });

  it("parses object payloads from localStorage", () => {
    expect(parseRegistrationSummary('{"language":"de","clubType":"football"}')).toEqual({
      language: "de",
      clubType: "football",
    });
  });
});

describe("buildCreateClubRpcPayload", () => {
  it("builds RPC args for onboarding club creation (AAA)", () => {
    const payload = buildCreateClubRpcPayload({
      clubName: "FC Steve Tack",
      clubDescription: "TestVerein",
      planParam: "squad",
      registrationSummary: '{"language":"de"}',
      nowMs: 1_700_000_000_000,
    });

    expect(payload._name).toBe("FC Steve Tack");
    expect(payload._slug).toBe("fc-steve-tack");
    expect(payload._description).toBe("TestVerein");
    expect(payload._plan_id).toBe("squad");
    expect(payload._metadata).toEqual({ source: "onboarding", language: "de" });
  });

  it("defaults plan to kickoff and omits empty description", () => {
    const payload = buildCreateClubRpcPayload({
      clubName: "Riverside FC",
      clubDescription: "   ",
      planParam: null,
      registrationSummary: null,
    });

    expect(payload._plan_id).toBe("kickoff");
    expect(payload._description).toBeNull();
    expect(payload._metadata).toEqual({ source: "onboarding" });
  });
});

describe("getCreateClubErrorMessage", () => {
  it("maps duplicate club_role_assignments constraint (409 from create_club_with_admin)", () => {
    expect(
      getCreateClubErrorMessage(
        {
          message:
            'duplicate key value violates unique constraint "idx_club_role_assignments_unique_club_self"',
        },
        errorLabels,
      ),
    ).toBe("provisioning-conflict");
  });

  it("maps not authenticated", () => {
    expect(getCreateClubErrorMessage({ message: "Not authenticated" }, errorLabels)).toBe("not-auth");
  });

  it("maps duplicate club slug", () => {
    expect(
      getCreateClubErrorMessage(
        { message: 'duplicate key value violates unique constraint "clubs_slug_key"' },
        errorLabels,
      ),
    ).toBe("duplicate-slug");
  });

  it("returns unknown label when error is empty", () => {
    expect(getCreateClubErrorMessage({}, errorLabels)).toBe("unknown");
  });
});
