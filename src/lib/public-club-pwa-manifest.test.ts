import { describe, expect, it } from "vitest";
import { buildPublicClubWebManifest } from "@/lib/public-club-pwa-manifest";

describe("buildPublicClubWebManifest", () => {
  it("scopes start_url and scope to the club home path", () => {
    const manifest = buildPublicClubWebManifest(
      {
        name: "TSV Allach 09",
        slug: "tsv-allach-09",
        primaryColor: "#195511",
        logoUrl: "https://cdn.example.com/logo.png",
      },
      { origin: "https://www.one4team.com" },
    );

    expect(manifest.start_url).toBe("https://www.one4team.com/club/tsv-allach-09/");
    expect(manifest.scope).toBe("https://www.one4team.com/club/tsv-allach-09/");
    expect(manifest.id).toBe("https://www.one4team.com/club/tsv-allach-09/");
    expect(manifest.name).toBe("TSV Allach 09");
    expect(manifest.short_name).toBe("TSV Allach…");
    expect(manifest.theme_color).toBe("#195511");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons[0]?.src).toContain("logo.png");
  });

  it("falls back to site favicon when no club icons exist", () => {
    const manifest = buildPublicClubWebManifest(
      { name: "Demo", slug: "demo" },
      { origin: "https://www.one4team.com" },
    );
    expect(manifest.icons.some((icon) => icon.src.endsWith("/favicon.png"))).toBe(true);
  });
});
