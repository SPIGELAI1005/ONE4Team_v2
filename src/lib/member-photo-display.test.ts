import { describe, expect, it } from "vitest";
import { resolveMemberPhotoDisplay } from "@/lib/member-photo-display";

describe("resolveMemberPhotoDisplay", () => {
  it("prefers registry photo over account avatar", () => {
    expect(
      resolveMemberPhotoDisplay("https://club.example/a.jpg", "https://account.example/b.jpg"),
    ).toEqual({
      url: "https://club.example/a.jpg",
      source: "registry",
      isAccountFallback: false,
    });
  });

  it("falls back to account avatar when registry photo is empty", () => {
    expect(resolveMemberPhotoDisplay(null, "https://account.example/b.jpg")).toEqual({
      url: "https://account.example/b.jpg",
      source: "account",
      isAccountFallback: true,
    });
  });

  it("returns null when neither photo exists", () => {
    expect(resolveMemberPhotoDisplay("", null)).toBeNull();
  });
});
