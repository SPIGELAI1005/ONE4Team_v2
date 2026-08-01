import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { MEMBER_MASTER_FIELDS, normalizeHeaderKey } from "@/lib/member-master-schema";
import {
  isGermanMitgliederlisteHeaders,
  parseSemicolonDelimitedCsv,
} from "@/lib/german-mitgliederliste-import";
import {
  parseRegistrySheetRows,
  pickBestSheetRows,
  type ImportColumnMappingEntry,
  type ParsedRegistryRow,
  type RegistryImportFormat,
  type RegistrySpreadsheetParseResult,
} from "@/lib/member-registry-spreadsheet-import";

export type { ImportColumnMappingEntry, ParsedRegistryRow, RegistryImportFormat, RegistrySpreadsheetParseResult };
export { masterFieldsFromRegistryImportRow } from "@/lib/member-registry-spreadsheet-import";

type XlsxModule = typeof import("xlsx");

function colWidthForField(column: string): number {
  return Math.min(42, Math.max(10, column.length + 4));
}

/** Professional multi-sheet workbook: instructions + full column template + optional data sheet. */
export async function buildMemberRegistryWorkbook(options: {
  clubName: string;
  membersSnapshot: Array<{
    email: string;
    displayName: string;
    role: string;
    status: string;
    team: string;
    ageGroup: string;
    position: string;
    joinedAt: string;
    master: Partial<ClubMemberMasterRecord> | null;
  }>;
}): Promise<void> {
  const xlsx = await import("xlsx") as XlsxModule;

  const headerRow = [
    "email",
    "role",
    "status",
    "team",
    "age_group",
    "position",
    "joined_at",
    ...MEMBER_MASTER_FIELDS.map((f) => f.column),
    "guardian_email",
    "ward_email",
  ];

  const instructions: (string | number)[][] = [
    ["ONE4Team - Member registry export"],
    [options.clubName],
    [],
    ["How to read this file"],
    ["• Sheet \"Registry\": one row per club member with app role + extended master data."],
    ["• Includes active roster rows plus saved pending imports (status draft = not invited yet, invited = invite sent)."],
    ["• Column headers use stable snake_case names so imports map reliably."],
    ["• German club exports (Mitgliederliste CSV with Mitglieds-Nr / Nachname / Vorname) are auto-detected on import."],
    ["• Mandatory columns (must be present for a complete record): first_name, last_name, sex, membership_kind."],
    ["• Recommended: birth_date (required for players), internal_club_number, club_registration_date, emergency contacts."],
    ["• membership_kind: active_participant | supporting_member"],
    ["• sex: male | female | other | prefer_not_to_say"],
    ["• Guardian columns: optional - use guardian_email + ward_email on the child's row to express a link in imports."],
    [],
    ["Data protection"],
    ["• Bank and passport fields are sensitive - share this file only through secure channels."],
  ];

  const dataRows = options.membersSnapshot.map((m) => {
    const r = m.master || {};
    const base = [
      m.email,
      m.role,
      m.status,
      m.team,
      m.ageGroup,
      m.position,
      m.joinedAt,
      ...MEMBER_MASTER_FIELDS.map((f) => formatMasterCell(r[f.key])),
      "",
      "",
    ];
    return base;
  });

  const sheetData = [headerRow, ...dataRows];

  const wb = xlsx.utils.book_new();

  const wsInstructions = xlsx.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 92 }];
  xlsx.utils.book_append_sheet(wb, wsInstructions, "Read me");

  const wsRegistry = xlsx.utils.aoa_to_sheet(sheetData);
  wsRegistry["!cols"] = headerRow.map((h) => ({ wch: colWidthForField(h) }));
  xlsx.utils.book_append_sheet(wb, wsRegistry, "Registry");

  const stamp = new Date().toISOString().slice(0, 10);
  xlsx.writeFile(wb, `one4team-member-registry-${stamp}.xlsx`);
}

function formatMasterCell(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  return String(value);
}

export async function buildMemberImportTemplateWorkbook(): Promise<void> {
  const xlsx = await import("xlsx") as XlsxModule;
  const headerRow = ["email", "role", ...MEMBER_MASTER_FIELDS.map((f) => f.column), "guardian_email", "ward_email"];
  const example = [
    "jamie@example.com",
    "player",
    ...MEMBER_MASTER_FIELDS.map((f) => {
      if (f.key === "first_name") return "Jamie";
      if (f.key === "last_name") return "Rivera";
      if (f.key === "sex") return "female";
      if (f.key === "birth_date") return "2012-04-18";
      if (f.key === "membership_kind") return "active_participant";
      if (f.key === "city") return "Munich";
      if (f.key === "internal_club_number") return "O4T-10492";
      return "";
    }),
    "parent@example.com",
    "",
  ];

  const ws = xlsx.utils.aoa_to_sheet([headerRow, example]);
  ws["!cols"] = headerRow.map((h) => ({ wch: colWidthForField(h) }));
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Import");
  xlsx.writeFile(wb, "one4team-member-registry-import-template.xlsx");
}

async function readWorkbookSheets(file: File): Promise<Array<{ name: string; rows: string[][] }>> {
  const xlsx = await import("xlsx") as XlsxModule;
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const raw = await file.text();
    const firstLine = raw.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
    const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : firstLine.includes(";") ? ";" : ",";

    if (delimiter === ";") {
      const rows = parseSemicolonDelimitedCsv(raw);
      if (rows.length > 0 && isGermanMitgliederlisteHeaders(rows[0])) {
        return [{ name: "CSV", rows }];
      }
    }

    const workbook = xlsx.read(raw, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsed = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];

    if (parsed.length > 0 && isGermanMitgliederlisteHeaders(parsed[0].map((c) => String(c ?? "")))) {
      if (delimiter === ";" && (parsed[0]?.length ?? 0) < 5) {
        return [{ name: "CSV", rows: parseSemicolonDelimitedCsv(raw) }];
      }
    }
    return [{ name: sheetName, rows: parsed }];
  }

  const buffer = await file.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
    return { name, rows };
  });
}

/** Parse spreadsheet using smart sheet + header detection and column title mapping. */
export async function parseRegistrySpreadsheet(file: File): Promise<RegistrySpreadsheetParseResult | null> {
  const sheets = await readWorkbookSheets(file);
  const picked = pickBestSheetRows(sheets);
  if (!picked) return null;
  return parseRegistrySheetRows(picked.rows, {
    sheetName: picked.sheetName,
    headerRowIndex: picked.headerRowIndex,
  });
}

/** Backward-compatible helper: returns parsed rows only (smart sheet selection). */
export async function parseRegistrySpreadsheetFirstSheet(file: File): Promise<ParsedRegistryRow[]> {
  const parsed = await parseRegistrySpreadsheet(file);
  return parsed?.rows ?? [];
}
