import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { GUARDIAN_IMPORT_COLUMNS, MEMBER_MASTER_FIELDS, normalizeHeaderKey, normalizeImportEmail } from "@/lib/member-master-schema";
import {
  enrichGermanMitgliederlisteRow,
  isGermanMitgliederlisteHeaders,
  parseSemicolonDelimitedCsv,
} from "@/lib/german-mitgliederliste-import";

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

export type RegistryImportFormat = "standard" | "german_mitgliederliste";

export interface ParsedRegistryRow {
  email: string;
  role: string;
  status: string;
  team: string;
  ageGroup: string;
  position: string;
  phone: string;
  raw: Record<string, string>;
  guardianEmail: string;
  wardEmail: string;
  sourceFormat: RegistryImportFormat;
}

async function readSpreadsheetRows(file: File): Promise<string[][]> {
  const xlsx = await import("xlsx") as XlsxModule;
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const raw = await file.text();
    const firstLine = raw.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
    const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : firstLine.includes(";") ? ";" : ",";

    if (delimiter === ";") {
      const rows = parseSemicolonDelimitedCsv(raw);
      if (rows.length > 0 && isGermanMitgliederlisteHeaders(rows[0])) {
        return rows;
      }
    }

    const workbook = xlsx.read(raw, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsed = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];

    if (parsed.length > 0 && isGermanMitgliederlisteHeaders(parsed[0].map((c) => String(c ?? "")))) {
      if (delimiter === ";" && (parsed[0]?.length ?? 0) < 5) {
        return parseSemicolonDelimitedCsv(raw);
      }
    }
    return parsed;
  }

  const buffer = await file.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
}

function buildStandardRegistryRow(
  headerCells: string[],
  line: string[],
  emailIdx: number,
  roleIdx: number,
  guardianIdx: number,
  wardIdx: number,
): ParsedRegistryRow {
  const raw: Record<string, string> = {};
  headerCells.forEach((header, j) => {
    const key = normalizeHeaderKey(header);
    if (key) raw[key] = String(line[j] ?? "").trim();
  });
  const email = emailIdx >= 0 ? normalizeImportEmail(String(line[emailIdx] ?? "")) : normalizeImportEmail(raw.email || raw.e_mail || "");
  const role = roleIdx >= 0 ? String(line[roleIdx] ?? "").trim() : raw.role || "";
  const guardianEmail = guardianIdx >= 0 ? String(line[guardianIdx] ?? "").trim() : "";
  const wardEmail = wardIdx >= 0 ? String(line[wardIdx] ?? "").trim() : "";

  return {
    email,
    role,
    status: raw.status || "",
    team: raw.team || "",
    ageGroup: raw.age_group || "",
    position: raw.position || "",
    phone: raw.phone || raw.telefon || raw.mobil || "",
    raw,
    guardianEmail,
    wardEmail,
    sourceFormat: "standard",
  };
}

/** Parse first worksheet rows into records using header row (row 0). */
export async function parseRegistrySpreadsheetFirstSheet(file: File): Promise<ParsedRegistryRow[]> {
  const rows = await readSpreadsheetRows(file);
  if (rows.length < 2) return [];

  const headerCells = (rows[0] || []).map((c) => String(c ?? ""));
  const isGerman = isGermanMitgliederlisteHeaders(headerCells);

  if (isGerman) {
    const out: ParsedRegistryRow[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const line = rows[i] || [];
      const raw: Record<string, string> = {};
      headerCells.forEach((header, j) => {
        const key = normalizeHeaderKey(header);
        if (key) raw[key] = String(line[j] ?? "").trim();
      });
      if (!Object.values(raw).some((v) => String(v).trim())) continue;

      const enriched = enrichGermanMitgliederlisteRow(raw);
      out.push({
        email: enriched.email,
        role: enriched.role,
        status: enriched.status,
        team: enriched.team,
        ageGroup: enriched.ageGroup,
        position: enriched.position,
        phone: enriched.phone,
        raw: enriched.raw,
        guardianEmail: enriched.guardianEmail,
        wardEmail: enriched.wardEmail,
        sourceFormat: "german_mitgliederliste",
      });
    }
    return out;
  }

  const normHeaders = headerCells.map((h) => normalizeHeaderKey(h));
  const emailIdx = normHeaders.findIndex((h) => h === "email" || h === "e_mail");
  const roleIdx = normHeaders.findIndex((h) => h === "role");
  const guardianIdx = normHeaders.findIndex((h) =>
    GUARDIAN_IMPORT_COLUMNS.guardian_email.some((a) => normalizeHeaderKey(a) === h),
  );
  const wardIdx = normHeaders.findIndex((h) =>
    GUARDIAN_IMPORT_COLUMNS.ward_email.some((a) => normalizeHeaderKey(a) === h),
  );

  const out: ParsedRegistryRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const line = rows[i] || [];
    const row = buildStandardRegistryRow(headerCells, line, emailIdx, roleIdx, guardianIdx, wardIdx);
    if (!row.email && !Object.values(row.raw).some((v) => String(v).trim())) continue;
    out.push(row);
  }
  return out;
}
