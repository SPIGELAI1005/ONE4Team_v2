import { describe, expect, it } from "vitest";
import {
  daysUntilPhotoExpiry,
  isPhotoExpired,
  photoValidUntil,
  shouldShowPhotoRenewalHint,
} from "@/lib/member-photo-validity";

describe("member-photo-validity", () => {
  it("computes valid-until as uploaded + 2 years", () => {
    const until = photoValidUntil("2024-07-28T10:00:00.000Z");
    expect(until?.toISOString()).toBe("2026-07-28T10:00:00.000Z");
  });

  it("flags expired photos after 2 years", () => {
    expect(isPhotoExpired("2023-01-01T00:00:00.000Z", new Date("2026-07-28"))).toBe(true);
    expect(isPhotoExpired("2025-01-01T00:00:00.000Z", new Date("2026-07-28"))).toBe(false);
    expect(isPhotoExpired(null)).toBe(false);
  });

  it("reports days until expiry", () => {
    expect(daysUntilPhotoExpiry("2024-07-28T00:00:00.000Z", new Date("2026-07-18T00:00:00.000Z"))).toBe(10);
    expect(daysUntilPhotoExpiry("2023-07-28T00:00:00.000Z", new Date("2026-07-28T00:00:00.000Z"))).toBeLessThanOrEqual(0);
  });

  it("shows renewal hint only when a photo exists and is expired", () => {
    expect(shouldShowPhotoRenewalHint("https://x/y.jpg", "2023-01-01", new Date("2026-07-28"))).toBe(true);
    expect(shouldShowPhotoRenewalHint(null, "2023-01-01", new Date("2026-07-28"))).toBe(false);
    expect(shouldShowPhotoRenewalHint("https://x/y.jpg", "2025-01-01", new Date("2026-07-28"))).toBe(false);
  });
});
