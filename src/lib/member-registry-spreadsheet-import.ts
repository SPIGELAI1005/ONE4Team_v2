/**
 * Smart spreadsheet import: pick the right sheet/header row and map columns to registry fields.
 */

import {
  GUARDIAN_IMPORT_COLUMNS,
  mapHeaderToMasterKey,
  masterFieldsFromFlatImport,
  normalizeHeaderKey,
  normalizeImportEmail,
  parseMembershipKind,
  type ClubMemberMasterRecord,
} from "@/lib/member-master-schema";
import {
  enrichGermanMitgliederlisteRow,
  isGermanMitgliederlisteHeaders,
} from "@/lib/german-mitgliederliste-import";

export const REGISTRY_COLUMN_ALIASES = {
  email: ["email", "e_mail", "mail", "emailadresse", "email_address", "kontakt_email", "app_email"],
  role: ["role", "app_role", "funktion", "funktionen", "rolle"],
  team: [
    "team",
    "squad",
    "department",
    "abteilung",
    "latest_department",
    "current_departments",
    "abteilung_1",
    "abteilungen",
  ],
  age_group: ["age_group", "agegroup", "altersklasse", "jugendgruppe"],
  position: ["position", "pos", "spielerposition"],
  status: ["status", "club_status", "membership_status", "mitgliedsstatus"],
  phone: ["phone", "telefon", "mobil", "mobile", "handy", "tel"],
  name: ["name", "full_name", "display_name", "mitglied"],
} as const;

export type RegistryColumnTarget =
  | "email"
  | "role"
  | "team"
  | "age_group"
  | "position"
  | "status"
  | "phone"
  | "name"
  | "guardian_email"
  | "ward_email"
  | keyof ClubMemberMasterRecord;

export interface ImportColumnMappingEntry {
  sourceHeader: string;
  target: RegistryColumnTarget;
  targetLabel: string;
}

const PREFERRED_SHEET_HINTS = [
  "registry",
  "import",
  "missing members",
  "mitglieder",
  "mitgliederliste",
  "data",
  "export",
];

const SKIP_SHEET_HINTS = [
  "summary",
  "read me",
  "readme",
  "instructions",
  "field coverage",
  "schema gaps",
  "data quality",
  "matched members",
  "app-only",
  "field gaps",
];

function findColumnIndex(normHeaders: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const idx = normHeaders.indexOf(normalizeHeaderKey(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function scoreHeaderRow(headerCells: string[]): number {
  if (!headerCells.some((cell) => String(cell ?? "").trim())) return -1;

  const normHeaders = headerCells.map((h) => normalizeHeaderKey(String(h ?? "")));
  if (isGermanMitgliederlisteHeaders(headerCells)) return 100;

  let score = 0;
  if (findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.email) >= 0) score += 20;

  for (const header of normHeaders) {
    if (mapHeaderToMasterKey(header)) score += 4;
  }

  for (const aliases of Object.values(REGISTRY_COLUMN_ALIASES)) {
    if (findColumnIndex(normHeaders, aliases) >= 0) score += 2;
  }

  if (findColumnIndex(normHeaders, GUARDIAN_IMPORT_COLUMNS.guardian_email) >= 0) score += 2;
  if (findColumnIndex(normHeaders, GUARDIAN_IMPORT_COLUMNS.ward_email) >= 0) score += 2;

  return score;
}

function scoreSheet(sheetName: string, headerCells: string[]): number {
  const headerScore = scoreHeaderRow(headerCells);
  if (headerScore < 0) return -1;

  let score = headerScore;
  const normName = sheetName.trim().toLowerCase();
  if (PREFERRED_SHEET_HINTS.some((hint) => normName.includes(hint))) score += 15;
  if (SKIP_SHEET_HINTS.some((hint) => normName.includes(hint))) score -= 40;
  return score;
}

export function findBestHeaderRowIndex(rows: string[][]): number {
  let bestIdx = 0;
  let bestScore = -1;
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i += 1) {
    const headerCells = (rows[i] || []).map((cell) => String(cell ?? ""));
    const score = scoreHeaderRow(headerCells);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function pickBestSheetRows(
  sheets: Array<{ name: string; rows: string[][] }>,
): { sheetName: string; rows: string[][]; headerRowIndex: number } | null {
  let best: { sheetName: string; rows: string[][]; headerRowIndex: number; score: number } | null = null;

  for (const sheet of sheets) {
    if (sheet.rows.length < 2) continue;
    const headerRowIndex = findBestHeaderRowIndex(sheet.rows);
    const headerCells = (sheet.rows[headerRowIndex] || []).map((cell) => String(cell ?? ""));
    const score = scoreSheet(sheet.name, headerCells);
    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { sheetName: sheet.name, rows: sheet.rows, headerRowIndex, score };
    }
  }

  if (!best) return null;
  return { sheetName: best.sheetName, rows: best.rows, headerRowIndex: best.headerRowIndex };
}

export function summarizeImportColumnMapping(headerCells: string[]): ImportColumnMappingEntry[] {
  const normHeaders = headerCells.map((h) => normalizeHeaderKey(String(h ?? "")));
  const usedTargets = new Set<string>();
  const entries: ImportColumnMappingEntry[] = [];

  const push = (sourceHeader: string, target: RegistryColumnTarget, targetLabel: string) => {
    if (!sourceHeader.trim() || usedTargets.has(target)) return;
    usedTargets.add(target);
    entries.push({ sourceHeader: sourceHeader.trim(), target, targetLabel });
  };

  for (let i = 0; i < headerCells.length; i += 1) {
    const sourceHeader = String(headerCells[i] ?? "").trim();
    if (!sourceHeader) continue;
    const norm = normHeaders[i];

    for (const [target, aliases] of Object.entries(REGISTRY_COLUMN_ALIASES) as Array<
      [keyof typeof REGISTRY_COLUMN_ALIASES, readonly string[]]
    >) {
      if (aliases.some((alias) => normalizeHeaderKey(alias) === norm)) {
        push(sourceHeader, target, target);
      }
    }

    const masterKey = mapHeaderToMasterKey(sourceHeader);
    if (masterKey) push(sourceHeader, masterKey, masterKey);

    if (GUARDIAN_IMPORT_COLUMNS.guardian_email.some((alias) => normalizeHeaderKey(alias) === norm)) {
      push(sourceHeader, "guardian_email", "guardian_email");
    }
    if (GUARDIAN_IMPORT_COLUMNS.ward_email.some((alias) => normalizeHeaderKey(alias) === norm)) {
      push(sourceHeader, "ward_email", "ward_email");
    }
  }

  return entries;
}

function readCell(line: string[], idx: number): string {
  if (idx < 0) return "";
  return String(line[idx] ?? "").trim();
}

function buildRawRow(headerCells: string[], line: string[]): Record<string, string> {
  const raw: Record<string, string> = {};
  headerCells.forEach((header, j) => {
    const key = normalizeHeaderKey(String(header ?? ""));
    if (!key) return;
    raw[key] = String(line[j] ?? "").trim();
  });
  return raw;
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

export interface RegistrySpreadsheetParseResult {
  rows: ParsedRegistryRow[];
  sheetName: string;
  headerRowIndex: number;
  columnMapping: ImportColumnMappingEntry[];
}

export function parseRegistrySheetRows(
  rows: string[][],
  options?: { sheetName?: string; headerRowIndex?: number },
): RegistrySpreadsheetParseResult | null {
  if (rows.length < 2) return null;

  const headerRowIndex = options?.headerRowIndex ?? findBestHeaderRowIndex(rows);
  const headerCells = (rows[headerRowIndex] || []).map((cell) => String(cell ?? ""));
  const columnMapping = summarizeImportColumnMapping(headerCells);

  if (isGermanMitgliederlisteHeaders(headerCells)) {
    const out: ParsedRegistryRow[] = [];
    for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
      const line = rows[i] || [];
      const raw = buildRawRow(headerCells, line);
      if (!Object.values(raw).some((value) => String(value).trim())) continue;
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
    return {
      rows: out,
      sheetName: options?.sheetName ?? "Sheet1",
      headerRowIndex,
      columnMapping,
    };
  }

  const normHeaders = headerCells.map((h) => normalizeHeaderKey(h));
  const emailIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.email);
  const roleIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.role);
  const teamIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.team);
  const ageGroupIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.age_group);
  const positionIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.position);
  const statusIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.status);
  const phoneIdx = findColumnIndex(normHeaders, REGISTRY_COLUMN_ALIASES.phone);
  const guardianIdx = findColumnIndex(normHeaders, GUARDIAN_IMPORT_COLUMNS.guardian_email);
  const wardIdx = findColumnIndex(normHeaders, GUARDIAN_IMPORT_COLUMNS.ward_email);

  const out: ParsedRegistryRow[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const line = rows[i] || [];
    const raw = buildRawRow(headerCells, line);
    const emailFromColumn = readCell(line, emailIdx);
    const email = normalizeImportEmail(emailFromColumn || raw.email || raw.e_mail || raw.mail || "");
    const role = readCell(line, roleIdx) || raw.role || "";
    const team = readCell(line, teamIdx) || raw.team || raw.latest_department || raw.current_departments || "";
    const ageGroup = readCell(line, ageGroupIdx) || raw.age_group || "";
    const position = readCell(line, positionIdx) || raw.position || "";
    const status = readCell(line, statusIdx) || raw.status || raw.club_status || "";
    const phone = readCell(line, phoneIdx) || raw.phone || raw.telefon || raw.mobil || "";
    const guardianEmail = readCell(line, guardianIdx);
    const wardEmail = readCell(line, wardIdx);

    if (!email && !Object.values(raw).some((value) => String(value).trim())) continue;

    out.push({
      email,
      role,
      status,
      team,
      ageGroup,
      position,
      phone,
      raw,
      guardianEmail,
      wardEmail,
      sourceFormat: "standard",
    });
  }

  return {
    rows: out,
    sheetName: options?.sheetName ?? "Sheet1",
    headerRowIndex,
    columnMapping,
  };
}

function deriveMembershipKindFromImportRow(row: ParsedRegistryRow): ClubMemberMasterRecord["membership_kind"] {
  const status = (row.status || row.raw.club_status || "").toLowerCase();
  if (status.includes("passiv")) return "supporting_member";
  const dept = (row.team || row.raw.latest_department || row.raw.current_departments || "").toLowerCase();
  if (/(jugend|herren|damen|senioren|hockey|fussball|sport|aktiv)/i.test(dept)) return "active_participant";
  return "supporting_member";
}

/** Map spreadsheet row columns into master-data fields (header aliases + derived values). */
export function masterFieldsFromRegistryImportRow(row: ParsedRegistryRow): Partial<ClubMemberMasterRecord> {
  const master = masterFieldsFromFlatImport(row.raw);
  if (!master.first_name && row.raw.vorname) master.first_name = row.raw.vorname;
  if (!master.last_name && row.raw.nachname) master.last_name = row.raw.nachname;
  if (!master.internal_club_number && row.raw.source_member_number) {
    master.internal_club_number = row.raw.source_member_number;
  }
  if (!master.membership_kind) {
    master.membership_kind = deriveMembershipKindFromImportRow(row);
  } else {
    const parsed = parseMembershipKind(String(master.membership_kind));
    if (parsed) master.membership_kind = parsed;
  }
  if (row.phone && !master.emergency_contact_phone) {
    /* phone stays on roster/contact context; keep in raw for display */
  }
  return master;
}
