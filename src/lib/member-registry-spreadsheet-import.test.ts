import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  findBestHeaderRowIndex,
  parseRegistrySheetRows,
  pickBestSheetRows,
  summarizeImportColumnMapping,
} from "@/lib/member-registry-spreadsheet-import";
import { masterFieldsFromFlatImport } from "@/lib/member-master-schema";

describe("member-registry-spreadsheet-import", () => {
  it("maps comparison Missing Members headers to master fields", () => {
    const headers = [
      "normalized_member_number",
      "first_name",
      "last_name",
      "email",
      "birth_date",
      "sex",
      "city",
      "club_entry_date",
    ];
    const mapping = summarizeImportColumnMapping(headers);
    const targets = mapping.map((entry) => entry.target);
    expect(targets).toContain("email");
    expect(targets).toContain("first_name");
    expect(targets).toContain("last_name");
    expect(targets).toContain("internal_club_number");
    expect(targets).toContain("birth_date");
    expect(targets).toContain("city");
    expect(targets).toContain("club_registration_date");
  });

  it("picks Missing Members sheet over Summary in comparison workbook", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["TSV comparison summary"],
        ["Metric", "Count"],
        ["Missing", 392],
      ]),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["normalized_member_number", "first_name", "last_name", "email", "birth_date", "sex", "city"],
        ["11281", "Alexander", "Neacsu", "george.neacsu@gmx.de", "2014-05-04", "male", "München"],
      ]),
      "Missing Members",
    );

    const sheets = wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, defval: "" }) as string[][],
    }));

    const picked = pickBestSheetRows(sheets);
    expect(picked?.sheetName).toBe("Missing Members");
    const parsed = parseRegistrySheetRows(picked!.rows, {
      sheetName: picked!.sheetName,
      headerRowIndex: picked!.headerRowIndex,
    });
    expect(parsed?.rows[0]?.email).toBe("george.neacsu@gmx.de");
    const master = masterFieldsFromFlatImport(parsed!.rows[0]!.raw);
    expect(master.internal_club_number).toBe("11281");
    expect(master.first_name).toBe("Alexander");
    expect(master.city).toBe("München");
  });

  it("prefers Registry sheet over Read me in ONE4Team export layout", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Instructions"], ["Use Registry sheet"]]),
      "Read me",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["email", "role", "first_name", "last_name", "internal_club_number"],
        ["player@example.com", "player", "Jamie", "Rivera", "10001"],
      ]),
      "Registry",
    );

    const sheets = wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, defval: "" }) as string[][],
    }));
    const picked = pickBestSheetRows(sheets);
    expect(picked?.sheetName).toBe("Registry");
  });

  it("finds header row when title rows precede columns", () => {
    const rows = [
      ["Club export"],
      [],
      ["Mitglieds-Nr", "Nachname", "Vorname", "E-Mail", "Geburtsdatum"],
      ["10001", "Rivera", "Jamie", "jamie@example.com", "2012-04-18"],
    ];
    expect(findBestHeaderRowIndex(rows)).toBe(2);
  });
});

describe("parseRegistrySpreadsheet", () => {
  it("returns column mapping metadata", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["email", "vorname", "nachname", "ort"],
        ["a@example.com", "Alex", "Muster", "München"],
      ]),
      "Import",
    );
    const sheets = wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, defval: "" }) as string[][],
    }));
    const picked = pickBestSheetRows(sheets);
    const parsed = parseRegistrySheetRows(picked!.rows, {
      sheetName: picked!.sheetName,
      headerRowIndex: picked!.headerRowIndex,
    });
    expect(parsed?.sheetName).toBe("Import");
    expect(parsed?.columnMapping.some((entry) => entry.target === "first_name")).toBe(true);
    expect(parsed?.columnMapping.some((entry) => entry.target === "city")).toBe(true);
    expect(parsed?.rows[0]?.email).toBe("a@example.com");
  });
});
