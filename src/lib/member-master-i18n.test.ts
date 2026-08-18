import { describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { en } from "@/i18n/en";
import { MEMBER_MASTER_FIELDS } from "@/lib/member-master-schema";

describe("member master-data i18n", () => {
  it("covers every registry field in English and German", () => {
    for (const field of MEMBER_MASTER_FIELDS) {
      const enLabel = en.membersPage.masterFieldLabels[field.column as keyof typeof en.membersPage.masterFieldLabels];
      const deLabel = de.membersPage.masterFieldLabels[field.column as keyof typeof de.membersPage.masterFieldLabels];
      expect(enLabel, field.column).toBeTruthy();
      expect(deLabel, field.column).toBeTruthy();
      if (field.column !== "iban") {
        expect(deLabel, `${field.column} should not stay English`).not.toBe(enLabel);
      }
    }
  });

  it("translates identity labels and enum values into German", () => {
    expect(de.membersPage.masterFieldLabels.first_name).toBe("Vorname");
    expect(de.membersPage.masterFieldLabels.last_name).toBe("Nachname");
    expect(de.membersPage.masterFieldLabels.sex).toBe("Geschlecht");
    expect(de.membersPage.masterFieldLabels.birth_date).toBe("Geburtsdatum");
    expect(de.membersPage.masterFieldLabels.membership_kind).toBe("Mitgliedschaftsart");
    expect(de.membersPage.masterValues.female).toBe("Weiblich");
    expect(de.membersPage.masterValues.active_participant).toBe("Aktives Mitglied");
  });
});
