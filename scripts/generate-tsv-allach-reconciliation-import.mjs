#!/usr/bin/env node
/**
 * Generate ONE4Team import workbook from TSV Allach comparison XLSX.
 *
 * Usage:
 *   node scripts/generate-tsv-allach-reconciliation-import.mjs [path-to-comparison.xlsx]
 */

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const defaultInput =
  "C:/Users/georg/OneDrive/Desktop/ONE4Team/TSV_Allach_09_ONE4Team_comparison_revised_2026-08-01.xlsx";
const inputPath = path.resolve(process.argv[2] || defaultInput);

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const wb = XLSX.readFile(inputPath);
const missing = XLSX.utils.sheet_to_json(wb.Sheets["Missing Members"], { defval: "" });
const gaps = XLSX.utils.sheet_to_json(wb.Sheets["Field Gaps"], { defval: "" });

function deriveRole(department, clubStatus) {
  const status = String(clubStatus || "").toLowerCase();
  if (status.includes("passiv")) return "member";
  const dept = String(department || "").toLowerCase();
  if (/(jugend|herren|damen|senioren|hockey|fussball|sport)/i.test(dept)) return "player";
  return "member";
}

function deriveKind(department, clubStatus) {
  const status = String(clubStatus || "").toLowerCase();
  if (status.includes("passiv")) return "supporting_member";
  const dept = String(department || "").toLowerCase();
  if (/(jugend|herren|damen|senioren|hockey|fussball|sport|aktiv)/i.test(dept)) return "active_participant";
  return "supporting_member";
}

const importRows = missing
  .filter((row) => {
    const status = String(row.club_status || "").toLowerCase();
    return !status || status === "aktiv" || status === "active";
  })
  .filter((row) => String(row.email || "").trim())
  .map((row) => ({
    email: String(row.email || "").trim(),
    role: deriveRole(row.latest_department || row.current_departments, row.club_status),
    status: "draft",
    team: String(row.latest_department || row.current_departments || "").trim(),
    age_group: "",
    position: "",
    first_name: String(row.first_name || "").trim(),
    last_name: String(row.last_name || "").trim(),
    sex: String(row.sex || "").trim(),
    birth_date: String(row.birth_date || "").trim(),
    internal_club_number: String(row.normalized_member_number || row.source_member_number || "").trim(),
    city: String(row.city || "").trim(),
    club_registration_date: String(row.club_entry_date || "").trim(),
    club_exit_date: String(row.club_exit_date || "").trim(),
    membership_kind: deriveKind(row.latest_department || row.current_departments, row.club_status),
    role_development_notes: [row.possible_account_link, row.reason].filter(Boolean).join(" · "),
    reconciliation_status: "missing_from_one4team",
  }));

const gapRows = gaps
  .filter((row) => {
    const issue = String(row.issue || "");
    return issue === "Missing in ONE4Team" || issue === "Missing or inconsistent membership type";
  })
  .map((row) => ({
    member_number: String(row.member_number || "").trim(),
    first_name: String(row.first_name || "").trim(),
    last_name: String(row.last_name || "").trim(),
    one4team_field: String(row.one4team_field || "").trim(),
    source_value: String(row.source_value || "").trim(),
    issue: String(row.issue || "").trim(),
    recommendation: String(row.recommendation || "").trim(),
    reconciliation_status: "field_gap",
  }));

const outDir = path.resolve("data/reconciliation");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);

const importWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(importWb, XLSX.utils.json_to_sheet(importRows), "Missing Members Import");
XLSX.utils.book_append_sheet(importWb, XLSX.utils.json_to_sheet(gapRows), "Field Gaps");
const importPath = path.join(outDir, `tsv-allach-missing-members-import-${stamp}.xlsx`);
XLSX.writeFile(importWb, importPath);

console.log(`Wrote ${importRows.length} missing-member import rows to ${importPath}`);
console.log(`Field gap reference rows: ${gapRows.length}`);
