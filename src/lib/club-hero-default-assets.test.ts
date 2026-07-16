import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertClubNeutralHeroPublicPath,
  CLUB_HERO_DEFAULT_ASSET_BASE,
  DEFAULT_CLUB_HERO_ASSETS,
  FORBIDDEN_PLATFORM_HERO_PATH_PATTERNS,
  getDefaultHeroAssetPublicPath,
  normalizeDefaultHeroAssetId,
} from "@/lib/club-hero-default-assets";

describe("club-hero-default-assets", () => {
  it("maps each known slot to its neutral asset path", () => {
    for (const asset of DEFAULT_CLUB_HERO_ASSETS) {
      expect(getDefaultHeroAssetPublicPath(asset.id)).toBe(asset.path);
      expect(asset.path.startsWith(`${CLUB_HERO_DEFAULT_ASSET_BASE}/`)).toBe(true);
    }
  });

  it("falls back to abstract neutral slot for unknown ids", () => {
    expect(normalizeDefaultHeroAssetId("unknown-slot")).toBe("abstract-sports-pattern-neutral");
    expect(getDefaultHeroAssetPublicPath("unknown-slot")).toBe(
      `${CLUB_HERO_DEFAULT_ASSET_BASE}/abstract-sports-pattern-neutral.png`,
    );
    expect(getDefaultHeroAssetPublicPath(null)).toBe(
      `${CLUB_HERO_DEFAULT_ASSET_BASE}/abstract-sports-pattern-neutral.png`,
    );
  });

  it("never returns pilot-club camp photography for any default slot", () => {
    const candidates = [
      ...DEFAULT_CLUB_HERO_ASSETS.map((asset) => asset.id),
      null,
      undefined,
      "",
      "not-a-real-slot",
    ];
    for (const id of candidates) {
      const path = getDefaultHeroAssetPublicPath(id);
      for (const pattern of FORBIDDEN_PLATFORM_HERO_PATH_PATTERNS) {
        expect(path).not.toMatch(pattern);
      }
      expect(() => assertClubNeutralHeroPublicPath(path)).not.toThrow();
    }
  });

  it("does not hardcode pilot camp image paths in hero defaults module source", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "club-hero-default-assets.ts"), "utf8");
    expect(source).not.toMatch(/["'`]\/images\/camps\//);
    expect(source).not.toMatch(/CLUB_HERO_INTERIM/);
  });
});
