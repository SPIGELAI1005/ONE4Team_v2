import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import {
  buildDefaultLegalValues,
  fillLegalTemplate,
  getLegalDealFields,
  getLegalPartyFields,
  getLegalPlaceholderFields,
  getLegalTemplates,
  getTemplatePlaceholderKeys,
} from "@/lib/operator-legal-templates";
import { imageDataUrlFormat } from "@/lib/operator-legal-brand";
import { buildLegalPdfDocument } from "@/lib/operator-legal-pdf";

describe("legal templates", () => {
  const fields = getLegalPlaceholderFields(en);
  const templatesEn = getLegalTemplates("en", en);
  const templatesDe = getLegalTemplates("de", en);

  it("exposes templates across all deal categories", () => {
    expect(templatesEn.length).toBeGreaterThanOrEqual(5);
    const categories = new Set(templatesEn.map((template) => template.category));
    expect(categories.has("Club")).toBe(true);
    expect(categories.has("Partner")).toBe(true);
    expect(categories.has("Compliance")).toBe(true);
  });

  it("fills provided values and shows readable tokens for missing ones", () => {
    const body = "Between {{providerLegalName}} and {{counterpartyName}} on {{effectiveDate}}.";
    const filled = fillLegalTemplate(
      body,
      {
        providerLegalName: "ONE4Team GmbH",
        counterpartyName: "TSV Allach",
      },
      fields,
    );
    expect(filled).toContain("ONE4Team GmbH");
    expect(filled).toContain("TSV Allach");
    expect(filled).toContain("[Effective date]");
    expect(filled).not.toContain("{{");
  });

  it("extracts unique placeholder keys", () => {
    const keys = getTemplatePlaceholderKeys("{{a}} {{b}} {{a}}");
    expect(keys.sort()).toEqual(["a", "b"]);
  });

  it("provides defaults for known fields", () => {
    const values = buildDefaultLegalValues(en);
    expect(values.providerLegalName).toBe("ONE4Team GmbH");
    expect(values.uptimeTarget).toBe("99.5%");
  });

  it("keeps party fields separate from deal fields", () => {
    const msa = templatesEn.find((template) => template.id === "club-msa");
    expect(msa).toBeTruthy();
    const partyKeys = getLegalPartyFields(en).map((field) => field.key);
    expect(partyKeys).toEqual(["providerLegalName", "counterpartyName"]);
    const dealKeys = getLegalDealFields(msa!.body, en).map((field) => field.key);
    expect(dealKeys).not.toContain("counterpartyName");
    expect(dealKeys).toContain("planName");
  });

  it("leaves no unresolved placeholders when defaults + counterparty are supplied", () => {
    const values = {
      ...buildDefaultLegalValues(en),
      counterpartyName: "Test Club",
      planName: "Pro",
      monthlyFee: "149",
      effectiveDate: "2026-01-01",
    };
    for (const template of templatesEn) {
      const filled = fillLegalTemplate(template.body, values, fields);
      expect(filled).not.toContain("{{");
    }
  });

  it("serves German bodies when language is de", () => {
    const enMsa = templatesEn.find((t) => t.id === "club-msa");
    const deMsa = templatesDe.find((t) => t.id === "club-msa");
    expect(enMsa?.body).toBeTruthy();
    expect(deMsa?.body).toBeTruthy();
    expect(deMsa?.body).not.toBe(enMsa?.body);
  });
});

describe("legal pdf export", () => {
  it("detects image formats from data URLs", () => {
    expect(imageDataUrlFormat("data:image/png;base64,abc")).toBe("PNG");
    expect(imageDataUrlFormat("data:image/jpeg;base64,abc")).toBe("JPEG");
  });

  it("builds a multi-page pdf document", () => {
    const longBody = Array.from({ length: 80 }, (_, index) => `Section ${index + 1}: Lorem ipsum contractual clause.`).join(
      "\n\n",
    );
    const doc = buildLegalPdfDocument({
      title: "Software Subscription Agreement (Club)",
      body: longBody,
      providerName: "ONE4Team GmbH",
      counterpartyName: "TSV Allach 09 e.V.",
      providerLogoDataUrl: null,
      counterpartyLogoDataUrl: null,
      language: "en",
      fileName: "test.pdf",
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});
