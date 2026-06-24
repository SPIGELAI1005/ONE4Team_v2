import { describe, expect, it } from "vitest";
import { applyClubPageLanguage, mapClubRow } from "@/lib/public-club-models";
import {
  editorFormToPublicPageConfig,
  emptyClubPublicPageEditorForm,
  enforceMultilingualOnEditorForm,
  publicPageConfigToEditorForm,
  publicPageConfigToJson,
  roundTripClubPageEditorForm,
} from "@/lib/club-public-page-config";

describe("club public page languages", () => {
  it("round-trips bilingual editor fields through JSON", () => {
    const input = {
      ...emptyClubPublicPageEditorForm(),
      name: "TSV Allach 09",
      slug: "tsv-allach-09",
      description: "English club description",
      default_language: "en",
      secondary_language_enabled: true,
      localized_secondary: {
        description: "Deutsche Vereinsbeschreibung",
        meta_title: "TSV DE",
        meta_description: "Offizielle Seite",
        news_page_subtitle: "Neuigkeiten",
        public_location_notes: "Parken im Norden",
      },
      meta_title: "TSV EN",
      meta_description: "Official site",
      news_page_subtitle: "Club news",
      public_location_notes: "Park at north lot",
      address: "Munich",
    };

    const output = roundTripClubPageEditorForm(input);
    expect(output.secondary_language_enabled).toBe(true);
    expect(output.localized_secondary.description).toBe("Deutsche Vereinsbeschreibung");
    expect(output.localized_secondary.meta_title).toBe("TSV DE");

    const config = editorFormToPublicPageConfig(input);
    expect(config.general.supported_languages).toEqual(["en", "de"]);
    expect(config.general.localized.de?.description).toBe("Deutsche Vereinsbeschreibung");
  });

  it("resolves localized visitor copy by active language", () => {
    const form = {
      ...emptyClubPublicPageEditorForm(),
      name: "TSV Allach 09",
      slug: "tsv-allach-09",
      description: "English club description",
      default_language: "en",
      secondary_language_enabled: true,
      localized_secondary: {
        description: "Deutsche Vereinsbeschreibung",
        meta_title: "TSV DE",
        meta_description: "Offizielle Seite",
        news_page_subtitle: "Neuigkeiten",
        public_location_notes: "Parken im Norden",
      },
      meta_title: "TSV EN",
      meta_description: "Official site",
      news_page_subtitle: "Club news",
      public_location_notes: "Park at north lot",
      address: "Munich",
    };
    const config = editorFormToPublicPageConfig(form);
    const row = {
      id: "club-1",
      name: config.general.name,
      slug: config.general.slug,
      is_public: true,
      public_page_published_config: publicPageConfigToJson(config),
    };

    const club = mapClubRow(row as Record<string, unknown>);
    expect(club.supported_languages).toEqual(["en", "de"]);

    const german = applyClubPageLanguage(club, "de");
    expect(german.description).toBe("Deutsche Vereinsbeschreibung");
    expect(german.meta_title).toBe("TSV DE");

    const english = applyClubPageLanguage(club, "en");
    expect(english.description).toBe("English club description");
    expect(english.meta_title).toBe("TSV EN");
  });

  it("loads secondary language fields when default language is German", () => {
    const config = editorFormToPublicPageConfig({
      ...emptyClubPublicPageEditorForm(),
      name: "TSV Allach 09",
      slug: "tsv-allach-09",
      default_language: "de",
      secondary_language_enabled: true,
      description: "Deutsche Beschreibung",
      localized_secondary: {
        description: "English description",
        meta_title: "",
        meta_description: "",
        news_page_subtitle: "",
        public_location_notes: "",
      },
      address: "Munich",
    });
    const form = publicPageConfigToEditorForm(config);
    expect(form.default_language).toBe("de");
    expect(form.description).toBe("Deutsche Beschreibung");
    expect(form.localized_secondary.description).toBe("English description");
    expect(config.general.supported_languages).toEqual(["de", "en"]);
  });

  it("strips bilingual settings when multilingual is not allowed", () => {
    const input = {
      ...emptyClubPublicPageEditorForm(),
      secondary_language_enabled: true,
      localized_secondary: {
        description: "DE text",
        meta_title: "DE title",
        meta_description: "",
        news_page_subtitle: "",
        public_location_notes: "",
      },
    };
    const enforced = enforceMultilingualOnEditorForm(input, false);
    expect(enforced.secondary_language_enabled).toBe(false);
    expect(enforced.localized_secondary.description).toBe("");
    const config = editorFormToPublicPageConfig(enforced);
    expect(config.general.supported_languages).toEqual(["en"]);
  });
});
