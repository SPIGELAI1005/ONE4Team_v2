/**
 * ONE4Team ↔ club export comparison workbook (e.g. TSV Allach reconciliation XLSX).
 */

import type { ClubMemberMasterRecord } from "@/lib/member-master-schema";
import { parseFlexibleDate, parseMembershipKind, parseSex } from "@/lib/member-master-schema";
import {
  buildSharedContactEmailGroups,
  normalizeContactEmail,
  type SharedContactEmailGroup,
} from "@/lib/member-shared-contact-email";

type XlsxModule = typeof import("xlsx");

export const COMPARISON_SHEET_NAMES = {
  missingMembers: "Missing Members",
  fieldGaps: "Field Gaps",
  dataQuality: "Data Quality",
  matchedMembers: "Matched Members",
  summary: "Summary",
} as const;

export interface ComparisonMissingMemberRow {
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  clubStatus: string;
  department: string;
  birthDate: string;
  sex: string;
  city: string;
  clubEntryDate: string;
  clubExitDate: string;
  possibleAccountLink: string;
  reason: string;
}

export interface ComparisonFieldGapPatch {
  memberNumber: string;
  firstName: string;
  lastName: string;
  one4teamField: string;
  sourceValue: string;
  issue: string;
  recommendation: string;
}

export interface ComparisonImportSummary {
  missingTotal: number;
  missingActive: number;
  missingWithEmail: number;
  missingWithoutEmail: number;
  fieldGapPatchCount: number;
  sharedEmailGroupCount: number;
  sharedEmailMemberCount: number;
}

export interface ComparisonWorkbookParseResult {
  missingMembers: ComparisonMissingMemberRow[];
  fieldGapPatches: ComparisonFieldGapPatch[];
  sharedEmailGroups: Map<string, SharedContactEmailGroup>;
  summary: ComparisonImportSummary;
}

export interface ComparisonBulkImportRow {
  name: string;
  email: string;
  role: string;
  team: string;
  ageGroup: string;
  position: string;
  masterData: Partial<ClubMemberMasterRecord>;
  reconciliationNote: string;
}

export function isClubComparisonWorkbook(sheetNames: string[]): boolean {
  return (
    sheetNames.includes(COMPARISON_SHEET_NAMES.missingMembers) &&
    sheetNames.includes(COMPARISON_SHEET_NAMES.fieldGaps)
  );
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function deriveRoleFromDepartment(department: string, clubStatus: string): string {
  const status = clubStatus.toLowerCase();
  if (status.includes("passiv")) return "member";
  const dept = department.toLowerCase();
  if (/(jugend|herren|damen|senioren|hockey|fussball|sport)/i.test(dept)) return "player";
  return "member";
}

function deriveMembershipKind(department: string, clubStatus: string): ClubMemberMasterRecord["membership_kind"] {
  const status = clubStatus.toLowerCase();
  if (status.includes("passiv")) return "supporting_member";
  const dept = department.toLowerCase();
  if (/(jugend|herren|damen|senioren|hockey|fussball|sport|aktiv)/i.test(dept)) {
    return "active_participant";
  }
  return "supporting_member";
}

function deriveAgeGroupFromDepartment(department: string): string {
  const match = department.match(/jugend\s*\(([^)]+)\)/i);
  if (match?.[1]) return match[1].trim();
  if (/jugend/i.test(department)) return "Jugend";
  return "";
}

function parseMissingMemberRow(raw: Record<string, unknown>): ComparisonMissingMemberRow | null {
  const memberNumber = cellString(raw.normalized_member_number || raw.source_member_number);
  const firstName = cellString(raw.first_name);
  const lastName = cellString(raw.last_name);
  if (!memberNumber && !firstName && !lastName) return null;

  return {
    memberNumber,
    firstName,
    lastName,
    email: cellString(raw.email),
    clubStatus: cellString(raw.club_status),
    department: cellString(raw.latest_department || raw.current_departments),
    birthDate: cellString(raw.birth_date),
    sex: cellString(raw.sex),
    city: cellString(raw.city),
    clubEntryDate: cellString(raw.club_entry_date),
    clubExitDate: cellString(raw.club_exit_date),
    possibleAccountLink: cellString(raw.possible_account_link),
    reason: cellString(raw.reason),
  };
}

function parseFieldGapRow(raw: Record<string, unknown>): ComparisonFieldGapPatch | null {
  const memberNumber = cellString(raw.member_number);
  const one4teamField = cellString(raw.one4team_field);
  if (!memberNumber || !one4teamField) return null;
  const issue = cellString(raw.issue);
  if (issue === "Different value") return null;
  if (issue === "Team not found in club departments") return null;
  if (issue === "Missing team assignment date") return null;
  const sourceValue = cellString(raw.source_value);
  if (!sourceValue) return null;

  return {
    memberNumber,
    firstName: cellString(raw.first_name),
    lastName: cellString(raw.last_name),
    one4teamField,
    sourceValue,
    issue,
    recommendation: cellString(raw.recommendation),
  };
}

function parseSharedEmailGroupsFromDataQuality(rows: unknown[][]): Map<string, SharedContactEmailGroup> {
  const entries: Array<{
    id: string;
    email: string;
    name: string;
    memberNumber?: string | null;
    source: "import";
  }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const email = cellString(row[0]);
    const countRaw = row[1];
    const membersText = cellString(row[2]);
    if (!email || !email.includes("@")) continue;
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count < 2) continue;

    const memberChunks = membersText.split(";").map((part) => part.trim()).filter(Boolean);
    for (const chunk of memberChunks) {
      const numberMatch = chunk.match(/\[([^\]]*)\]\s*$/);
      const memberNumber = numberMatch?.[1]?.trim() || null;
      const name = chunk.replace(/\[[^\]]*\]\s*$/, "").trim() || chunk;
      entries.push({
        id: `${email}:${memberNumber || name}`,
        email,
        name,
        memberNumber,
        source: "import",
      });
    }
  }

  return buildSharedContactEmailGroups(entries);
}

export function comparisonMissingToBulkImportRows(
  rows: ComparisonMissingMemberRow[],
  options?: { activeOnly?: boolean },
): ComparisonBulkImportRow[] {
  const activeOnly = options?.activeOnly ?? true;
  return rows
    .filter((row) => {
      if (!activeOnly) return true;
      const status = row.clubStatus.toLowerCase();
      return !status || status === "aktiv" || status === "active";
    })
    .map((row) => {
      const masterData: Partial<ClubMemberMasterRecord> = {
        first_name: row.firstName || null,
        last_name: row.lastName || null,
        internal_club_number: row.memberNumber || null,
        city: row.city || null,
        membership_kind: deriveMembershipKind(row.department, row.clubStatus),
      };

      const birthDate = parseFlexibleDate(row.birthDate);
      if (birthDate) masterData.birth_date = birthDate;
      const sex = parseSex(row.sex);
      if (sex) masterData.sex = sex;
      const entryDate = parseFlexibleDate(row.clubEntryDate);
      if (entryDate) masterData.club_registration_date = entryDate;
      const exitDate = parseFlexibleDate(row.clubExitDate);
      if (exitDate) masterData.club_exit_date = exitDate;

      const notes: string[] = [];
      if (row.possibleAccountLink) notes.push(row.possibleAccountLink);
      if (row.reason) notes.push(row.reason);
      if (notes.length) {
        masterData.role_development_notes = notes.join(" · ");
      }

      return {
        name: [row.firstName, row.lastName].filter(Boolean).join(" "),
        email: row.email,
        role: deriveRoleFromDepartment(row.department, row.clubStatus),
        team: row.department.trim(),
        ageGroup: deriveAgeGroupFromDepartment(row.department),
        position: "",
        masterData,
        reconciliationNote: row.possibleAccountLink || row.reason || "",
      };
    });
}

const GAP_FIELD_MAP: Record<string, keyof ClubMemberMasterRecord> = {
  city: "city",
  postal_code: "postal_code",
  street_line: "street_line",
  address_line2: "address_line2",
  country: "country",
  club_pass_generated_at: "club_pass_generated_at",
  membership_kind: "membership_kind",
  emergency_contact_phone: "emergency_contact_phone",
  emergency_contact_name: "emergency_contact_name",
};

export function fieldGapPatchToMasterValue(
  field: string,
  rawValue: string,
): Partial<ClubMemberMasterRecord> {
  const key = GAP_FIELD_MAP[field];
  if (!key) return {};
  const value = rawValue.trim();
  if (!value) return {};

  switch (key) {
    case "membership_kind": {
      const kind = parseMembershipKind(value);
      return kind ? { membership_kind: kind } : {};
    }
    case "club_pass_generated_at": {
      const date = parseFlexibleDate(value);
      return date ? { club_pass_generated_at: date } : {};
    }
    default:
      return { [key]: value } as Partial<ClubMemberMasterRecord>;
  }
}

export function mergeFieldGapPatches(
  patches: ComparisonFieldGapPatch[],
): Map<string, Partial<ClubMemberMasterRecord>> {
  const byMember = new Map<string, Partial<ClubMemberMasterRecord>>();
  for (const patch of patches) {
    const merged = fieldGapPatchToMasterValue(patch.one4teamField, patch.sourceValue);
    if (!Object.keys(merged).length) continue;
    const current = byMember.get(patch.memberNumber) ?? {};
    byMember.set(patch.memberNumber, { ...current, ...merged });
  }
  return byMember;
}

export async function parseClubComparisonWorkbook(file: File): Promise<ComparisonWorkbookParseResult> {
  const xlsx = (await import("xlsx")) as XlsxModule;
  const buffer = await file.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: "array" });

  const missingRaw = xlsx.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[COMPARISON_SHEET_NAMES.missingMembers],
    { defval: "" },
  );
  const missingMembers = missingRaw
    .map(parseMissingMemberRow)
    .filter((row): row is ComparisonMissingMemberRow => row !== null);

  const gapRaw = xlsx.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[COMPARISON_SHEET_NAMES.fieldGaps],
    { defval: "" },
  );
  const fieldGapPatches = gapRaw
    .map(parseFieldGapRow)
    .filter((row): row is ComparisonFieldGapPatch => row !== null);

  const dqSheet = workbook.Sheets[COMPARISON_SHEET_NAMES.dataQuality];
  const dqRows = dqSheet
    ? (xlsx.utils.sheet_to_json(dqSheet, { header: 1, defval: "" }) as unknown[][])
    : [];
  const sharedEmailGroups = parseSharedEmailGroupsFromDataQuality(dqRows);

  let sharedEmailMemberCount = 0;
  for (const group of sharedEmailGroups.values()) {
    sharedEmailMemberCount += group.members.length;
  }

  const missingWithEmail = missingMembers.filter((row) => normalizeContactEmail(row.email)).length;

  return {
    missingMembers,
    fieldGapPatches,
    sharedEmailGroups,
    summary: {
      missingTotal: missingMembers.length,
      missingActive: missingMembers.filter((row) => {
        const status = row.clubStatus.toLowerCase();
        return !status || status === "aktiv" || status === "active";
      }).length,
      missingWithEmail,
      missingWithoutEmail: missingMembers.length - missingWithEmail,
      fieldGapPatchCount: fieldGapPatches.length,
      sharedEmailGroupCount: sharedEmailGroups.size,
      sharedEmailMemberCount,
    },
  };
}
