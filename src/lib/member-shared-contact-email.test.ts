import { describe, expect, it } from "vitest";
import {
  collectDraftIdentityKeys,
  memberRegistryIdentityKey,
  normalizeContactEmail,
  registryImportRowLinkKey,
  resolveNewDraftIdentityKey,
} from "@/lib/member-shared-contact-email";
import { canAddRegistryRowToSavedList } from "@/lib/member-import-dedupe";

describe("member-shared-contact-email identity keys", () => {
  it("uses club number key when available and free", () => {
    const existing = new Set<string>();
    const key = resolveNewDraftIdentityKey("uli-fries@gmx.de", "11053", "Uli Fries", existing);
    expect(key).toBe("num:11053");
  });

  it("uses club number key without email when number is free", () => {
    const existing = new Set<string>();
    const key = resolveNewDraftIdentityKey("", "11123", "Kilian Amschler", existing);
    expect(key).toBe("num:11123");
  });

  it("falls back to person key when club number is taken by another saved draft", () => {
    const existing = new Set(collectDraftIdentityKeys("uli-fries@gmx.de", "11053", "Jacob Fries"));
    const key = resolveNewDraftIdentityKey("uli-fries@gmx.de", "11053", "Uli Fries", existing, {
      clubNumberConflict: true,
    });
    expect(key).toBe("person:uli-fries@gmx.de:uli fries");
  });

  it("falls back to name key when no email and club number is taken", () => {
    const existing = new Set(["num:11123"]);
    const key = resolveNewDraftIdentityKey("", "11123", "Kilian Amschler", existing, {
      clubNumberConflict: true,
    });
    expect(key).toBe("name:kilian amschler");
  });

  it("tracks number, person, and name keys for existing drafts", () => {
    const keys = collectDraftIdentityKeys("family@gmx.de", "10577", "Ralf Gubisch");
    expect(keys).toContain("num:10577");
    expect(keys).toContain("person:family@gmx.de:ralf gubisch");
    expect(memberRegistryIdentityKey("family@gmx.de", "10577", "Ralf Gubisch")).toBe("num:10577");
  });

  it("handles null email for identity keys", () => {
    expect(memberRegistryIdentityKey(null as unknown as string, "11123", "Kilian Amschler")).toBe("num:11123");
    expect(normalizeContactEmail(null)).toBe("");
  });

  it("builds link keys for no-email registry rows", () => {
    expect(registryImportRowLinkKey("", "Kilian Amschler", "11123")).toBe("num:11123::kilian amschler");
    expect(registryImportRowLinkKey("", "Kilian Amschler")).toBe("name:kilian amschler");
  });
});

describe("canAddRegistryRowToSavedList", () => {
  it("allows unmatched rows with club number but no email", () => {
    expect(
      canAddRegistryRowToSavedList({
        payload: { internal_club_number: "11123", first_name: "Kilian", last_name: "Amschler" },
      }),
    ).toBe(true);
  });

  it("rejects rows without email, number, or name", () => {
    expect(canAddRegistryRowToSavedList({ payload: {} })).toBe(false);
  });
});
