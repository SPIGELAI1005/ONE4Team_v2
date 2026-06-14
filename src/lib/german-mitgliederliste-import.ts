/**
 * German club membership exports (e.g. TSV Allach 09 "Mitgliederliste" CSV).
 * Semicolon-delimited wide layout with repeating Abteilung/Beitrag columns.
 */

import {
  normalizeHeaderKey,
  normalizeImportEmail,
  parseFlexibleDate,
  parseMembershipKind,
  parseSex,
} from "@/lib/member-master-schema";

export type GermanMitgliederlisteEnrichedRow = {
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
};

/** Detect German Mitgliederliste export by signature headers. */
export function isGermanMitgliederlisteHeaders(headerCells: string[]): boolean {
  const norm = headerCells.map((h) => normalizeHeaderKey(h));
  return norm.includes("mitglieds_nr") && norm.includes("nachname") && norm.includes("vorname");
}

/** Parse semicolon-separated CSV (German Excel default). */
export function parseSemicolonDelimitedCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(";").map((cell) => cell.trim()));
}

function cell(raw: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const v = raw[normalizeHeaderKey(key)];
    if (v?.trim()) return v.trim();
  }
  return "";
}

function stripMemberNumberPrefix(value: string): string {
  return value.replace(/^\*\s*/, "").trim();
}

function extractDepartmentLabel(abteilung1: string, abteilungen: string): string {
  const primary = abteilung1.trim() || abteilungen.trim();
  if (!primary) return "";
  const beforeParen = primary.split("(")[0]?.trim();
  return beforeParen || primary;
}

export function deriveGermanMembershipKind(abteilung1: string, abteilungen: string): string {
  const label = extractDepartmentLabel(abteilung1, abteilungen).toLowerCase();
  if (!label) return "supporting_member";
  if (/(jugend|herren|damen|senioren|fussball|hockey|sport|aktiv)/i.test(label)) {
    return "active_participant";
  }
  return "supporting_member";
}

export function deriveGermanAppRole(
  funktionen: string,
  abteilung1: string,
  abteilungen: string,
  passnummer: string,
): string {
  const f = funktionen.toLowerCase();
  if (/(trainer|co-?trainer|übungsleiter|uebungsleiter|coach)/i.test(f)) return "trainer";
  if (/(admin|vorstand|geschäftsführ|geschaeftsfuehr|leitung|vorstandschaft)/i.test(f)) return "admin";
  if (/(betreuer|eltern|parent|erziehungs)/i.test(f)) return "parent";
  if (/(mitarbeiter|staff|angestell)/i.test(f)) return "staff";

  const dept = `${abteilung1} ${abteilungen}`.toLowerCase();
  if (passnummer.trim() || /(jugend|herren|damen|senioren)/i.test(dept)) return "player";
  if (funktionen.trim()) return "staff";
  return "member";
}

export function deriveGermanMembershipStatus(
  status: string,
  austrittsdatum: string,
  mitgliedsNr: string,
): string {
  if (austrittsdatum.trim() || mitgliedsNr.startsWith("*")) return "inactive";
  const s = status.trim().toLowerCase();
  if (!s || s === "aktiv") return "active";
  return "inactive";
}

/** Normalize DE phone cells including Excel scientific notation (4,91574E+12). */
export function normalizeGermanPhone(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/e[+\-]/i.test(t)) {
    const n = Number(t.replace(",", "."));
    if (Number.isFinite(n)) {
      const digits = String(Math.round(n));
      return digits.startsWith("49") ? `+${digits}` : digits;
    }
  }
  return t.replace(/\s+/g, " ");
}

function collectGermanNotes(raw: Record<string, string>): string {
  const parts: string[] = [];
  const exitReason = cell(raw, "Vereinsaustrittsgrund");
  if (exitReason) parts.push(`Vereinsaustritt: ${exitReason}`);

  const deptExit = cell(raw, "Abteilungsaustrittsgrund_1");
  if (deptExit) parts.push(`Abteilungsaustritt: ${deptExit}`);

  for (let i = 1; i <= 3; i += 1) {
    const subject = cell(raw, `Notizen-Betreff_${i}`);
    const text = cell(raw, `Notizen-Text_${i}`);
    if (subject || text) {
      parts.push([subject, text].filter(Boolean).join(": "));
    }
  }
  return parts.join("\n");
}

function pickPhone(raw: Record<string, string>): string {
  const mobil = normalizeGermanPhone(cell(raw, "Mobil"));
  if (mobil) return mobil;
  return normalizeGermanPhone(cell(raw, "Telefon"));
}

/**
 * Map one normalized German export row into ONE4Team registry import shape.
 * `raw` retains German keys and adds English keys where aliases may not match.
 */
export function enrichGermanMitgliederlisteRow(raw: Record<string, string>): GermanMitgliederlisteEnrichedRow {
  const email = normalizeImportEmail(cell(raw, "E-Mail"));
  const abteilung1 = cell(raw, "Abteilung_1");
  const abteilungen = cell(raw, "Abteilungen");
  const passnummer = cell(raw, "Passnummer");
  const funktionen = cell(raw, "Funktionen");
  const mitgliedsNrRaw = cell(raw, "Mitglieds-Nr");

  const deptLabel = extractDepartmentLabel(abteilung1, abteilungen);
  const role = deriveGermanAppRole(funktionen, abteilung1, abteilungen, passnummer);
  const status = deriveGermanMembershipStatus(
    cell(raw, "Status"),
    cell(raw, "Austrittsdatum"),
    mitgliedsNrRaw,
  );

  const notes = collectGermanNotes(raw);
  const spielrecht = cell(raw, "Spielrecht");
  const passdatum = cell(raw, "Passdatum");
  const eintritt = cell(raw, "Eintrittsdatum");
  const austritt = cell(raw, "Austrittsdatum");
  const abteilungEintritt = cell(raw, "Abteilungseintritt_1");
  const membershipKind = deriveGermanMembershipKind(abteilung1, abteilungen);

  const enrichedRaw: Record<string, string> = { ...raw };

  const firstName = cell(raw, "Vorname");
  const lastName = cell(raw, "Nachname");
  if (firstName) enrichedRaw.first_name = firstName;
  if (lastName) enrichedRaw.last_name = lastName;

  const internalNr = stripMemberNumberPrefix(mitgliedsNrRaw);
  if (internalNr) enrichedRaw.internal_club_number = internalNr;

  const sexRaw = cell(raw, "Geschlecht");
  if (sexRaw) {
    const parsed = parseSex(sexRaw);
    if (parsed) enrichedRaw.sex = parsed;
  }

  const birth = cell(raw, "Geburtsdatum") || cell(raw, "Geburtstag");
  const birthIso = parseFlexibleDate(birth);
  if (birthIso) enrichedRaw.birth_date = birthIso;

  const regIso = parseFlexibleDate(eintritt);
  if (regIso) enrichedRaw.club_registration_date = regIso;

  const exitIso = parseFlexibleDate(austritt);
  if (exitIso) enrichedRaw.club_exit_date = exitIso;

  const teamAssignIso = parseFlexibleDate(abteilungEintritt);
  if (teamAssignIso) enrichedRaw.team_assignment_date = teamAssignIso;

  const passIso = parseFlexibleDate(passdatum);
  if (passIso) enrichedRaw.club_pass_generated_at = passIso;

  if (passnummer) enrichedRaw.player_passport_number = passnummer;
  if (spielrecht) enrichedRaw.squad_status = spielrecht;

  enrichedRaw.membership_kind = membershipKind;
  const kindParsed = parseMembershipKind(membershipKind);
  if (kindParsed) enrichedRaw.membership_kind = kindParsed;

  if (notes) {
    const existing = enrichedRaw.role_development_notes?.trim();
    enrichedRaw.role_development_notes = existing ? `${existing}\n${notes}` : notes;
  }

  enrichedRaw.status = status;
  enrichedRaw.team = deptLabel;
  enrichedRaw.age_group = deptLabel;
  enrichedRaw.phone = pickPhone(raw);

  return {
    email,
    role,
    status,
    team: deptLabel,
    ageGroup: deptLabel,
    position: "",
    phone: pickPhone(raw),
    raw: enrichedRaw,
    guardianEmail: "",
    wardEmail: "",
  };
}
