import type { Language } from "@/i18n";
import type { Translations } from "@/i18n";
import {
  LEGAL_TEMPLATE_BODIES_DE,
  LEGAL_TEMPLATE_BODIES_EN,
  LEGAL_TEMPLATE_IDS,
  type LegalTemplateId,
} from "@/lib/operator-legal-templates/bodies";

export interface LegalPlaceholderField {
  key: string;
  label: string;
  type: "text" | "date" | "number";
  defaultValue?: string;
  placeholder?: string;
}

export interface LegalTemplate {
  id: LegalTemplateId;
  title: string;
  category: "Club" | "Partner" | "Compliance";
  summary: string;
  body: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const TEMPLATE_CATEGORIES: Record<LegalTemplateId, LegalTemplate["category"]> = {
  "club-msa": "Club",
  sla: "Club",
  dpa: "Compliance",
  "partner-collaboration": "Partner",
  sponsorship: "Partner",
  "pilot-loi": "Club",
};

export function getLegalPlaceholderFields(t: Translations): LegalPlaceholderField[] {
  const p = t.operator.legal;
  return [
    { key: "providerLegalName", label: p.parties.providerLegalName, type: "text", defaultValue: p.defaults.providerLegalName },
    { key: "counterpartyName", label: p.parties.counterpartyName, type: "text", placeholder: p.parties.counterpartyNamePh },
    { key: "counterpartyKind", label: p.placeholders.counterpartyKind, type: "text", defaultValue: p.defaults.counterpartyKind },
    { key: "effectiveDate", label: p.placeholders.effectiveDate, type: "date" },
    { key: "planName", label: p.placeholders.planName, type: "text", placeholder: p.placeholders.planNamePh },
    { key: "monthlyFee", label: p.placeholders.monthlyFee, type: "number", placeholder: p.placeholders.monthlyFeePh },
    { key: "termMonths", label: p.placeholders.termMonths, type: "number", defaultValue: p.defaults.termMonths },
    { key: "uptimeTarget", label: p.placeholders.uptimeTarget, type: "text", defaultValue: p.defaults.uptimeTarget },
    { key: "supportResponse", label: p.placeholders.supportResponse, type: "text", defaultValue: p.defaults.supportResponse },
    { key: "jurisdiction", label: p.placeholders.jurisdiction, type: "text", defaultValue: p.defaults.jurisdiction },
    { key: "governingLaw", label: p.placeholders.governingLaw, type: "text", defaultValue: p.defaults.governingLaw },
  ];
}

export function getLegalTemplates(language: Language, t: Translations): LegalTemplate[] {
  const bodies = language === "de" ? LEGAL_TEMPLATE_BODIES_DE : LEGAL_TEMPLATE_BODIES_EN;
  const legal = t.operator.legal;

  return LEGAL_TEMPLATE_IDS.map((id) => {
    const category = TEMPLATE_CATEGORIES[id];
    return {
      id,
      title: legal.templateTitles[id],
      category,
      summary: legal.templateSummaries[id],
      body: bodies[id],
    };
  });
}

export function getLegalCategoryLabel(category: LegalTemplate["category"], t: Translations): string {
  return t.operator.legal.categories[category];
}

function labelForKey(key: string, fields: LegalPlaceholderField[]): string {
  return fields.find((field) => field.key === key)?.label ?? key;
}

export function fillLegalTemplate(
  body: string,
  values: Record<string, string>,
  fields: LegalPlaceholderField[],
): string {
  return body.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = values[key]?.trim();
    if (value) return value;
    return `[${labelForKey(key, fields)}]`;
  });
}

export function getTemplatePlaceholderKeys(body: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(PLACEHOLDER_PATTERN);
  while ((match = pattern.exec(body)) !== null) {
    keys.add(match[1]);
  }
  return [...keys];
}

export const PARTY_FIELD_KEYS = new Set(["providerLegalName", "counterpartyName"]);

export function getLegalDealFields(
  templateBody: string,
  t: Translations,
): LegalPlaceholderField[] {
  const usedKeys = new Set(getTemplatePlaceholderKeys(templateBody));
  return getLegalPlaceholderFields(t).filter(
    (field) => usedKeys.has(field.key) && !PARTY_FIELD_KEYS.has(field.key),
  );
}

export function getLegalPartyFields(t: Translations): LegalPlaceholderField[] {
  return getLegalPlaceholderFields(t).filter((field) => PARTY_FIELD_KEYS.has(field.key));
}

export function buildDefaultLegalValues(t: Translations): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of getLegalPlaceholderFields(t)) {
    if (field.defaultValue) values[field.key] = field.defaultValue;
  }
  return values;
}
