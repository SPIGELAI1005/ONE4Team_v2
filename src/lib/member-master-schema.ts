/** Club member registry — field definitions, Excel aliases, and completeness rules. */

export interface ClubMemberMasterRecord {
  membership_id: string;
  club_id: string;
  sex: "male" | "female" | "other" | "prefer_not_to_say" | null;
  first_name: string | null;
  last_name: string | null;
  street_line: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  birth_date: string | null;
  membership_kind: "active_participant" | "supporting_member";
  photo_url: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  iban: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  strong_leg: "left" | "right" | "both" | null;
  strong_hand: "left" | "right" | "both" | null;
  shirt_size: string | null;
  shoe_size: string | null;
  jersey_number: number | null;
  role_development_notes: string | null;
  strengths: string | null;
  goals_count: number | null;
  club_registration_date: string | null;
  team_assignment_date: string | null;
  club_exit_date: string | null;
  invoice_reference: string | null;
  player_passport_number: string | null;
  internal_club_number: string | null;
  club_pass_generated_at: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberMasterFieldMeta {
  key: keyof ClubMemberMasterRecord;
  /** Spreadsheet / API column name */
  column: string;
  /** Alternative header labels (normalized in code) */
  aliases: string[];
  required: boolean;
  /** Extra fields shown in UI hints */
  recommended?: boolean;
  group: "identity" | "contact" | "sport" | "performance" | "club" | "financial" | "safety";
}

export const MEMBER_MASTER_FIELDS: MemberMasterFieldMeta[] = [
  { key: "first_name", column: "first_name", aliases: ["firstname", "given_name", "vorname"], required: true, group: "identity" },
  { key: "last_name", column: "last_name", aliases: ["lastname", "family_name", "surname", "nachname"], required: true, group: "identity" },
  {
    key: "sex",
    column: "sex",
    aliases: ["gender", "geschlecht"],
    required: true,
    recommended: true,
    group: "identity",
  },
  {
    key: "birth_date",
    column: "birth_date",
    aliases: ["birthday", "date_of_birth", "dob", "geburtsdatum"],
    required: false,
    recommended: true,
    group: "identity",
  },
  {
    key: "membership_kind",
    column: "membership_kind",
    aliases: ["member_kind", "participant_type", "active_or_supporting", "mitgliedschaft"],
    required: true,
    group: "identity",
  },
  { key: "nationality", column: "nationality", aliases: ["citizenship", "staatsangehoerigkeit"], required: false, group: "identity" },
  { key: "photo_url", column: "photo_url", aliases: ["picture", "avatar", "image_url", "foto"], required: false, group: "identity" },

  { key: "street_line", column: "street_line", aliases: ["street", "address", "strasse", "strasse_zeile1"], required: false, group: "contact" },
  { key: "address_line2", column: "address_line2", aliases: ["address2", "line2"], required: false, group: "contact" },
  { key: "postal_code", column: "postal_code", aliases: ["zip", "plz"], required: false, group: "contact" },
  { key: "city", column: "city", aliases: ["town", "ort", "stadt"], required: false, group: "contact" },
  { key: "country", column: "country", aliases: ["land"], required: false, group: "contact" },

  { key: "height_cm", column: "height_cm", aliases: ["height", "groesse_cm", "size_cm"], required: false, group: "sport" },
  { key: "weight_kg", column: "weight_kg", aliases: ["weight", "gewicht_kg"], required: false, group: "sport" },
  {
    key: "strong_leg",
    column: "strong_leg",
    aliases: ["preferred_leg", "strong_foot", "kick_leg"],
    required: false,
    group: "sport",
  },
  {
    key: "strong_hand",
    column: "strong_hand",
    aliases: ["preferred_hand", "dominant_hand"],
    required: false,
    group: "sport",
  },
  { key: "shirt_size", column: "shirt_size", aliases: ["t_shirt_size", "tshirt_size", "trikotgroesse"], required: false, group: "sport" },
  { key: "shoe_size", column: "shoe_size", aliases: ["shoe", "schuhgroesse"], required: false, group: "sport" },
  { key: "jersey_number", column: "jersey_number", aliases: ["shirt_number", "number", "trikotnummer"], required: false, group: "sport" },
  {
    key: "role_development_notes",
    column: "role_development_notes",
    aliases: ["development", "training_notes", "skills_notes"],
    required: false,
    group: "sport",
  },

  { key: "strengths", column: "strengths", aliases: ["skills", "qualities"], required: false, group: "performance" },
  { key: "goals_count", column: "goals_count", aliases: ["goals", "tore"], required: false, group: "performance" },

  {
    key: "club_registration_date",
    column: "club_registration_date",
    aliases: ["registered_at", "member_since", "vereinsbeitritt"],
    required: false,
    recommended: true,
    group: "club",
  },
  {
    key: "team_assignment_date",
    column: "team_assignment_date",
    aliases: ["assigned_to_team_at", "team_since"],
    required: false,
    group: "club",
  },
  { key: "club_exit_date", column: "club_exit_date", aliases: ["left_at", "exit_date", "austritt"], required: false, group: "club" },
  { key: "invoice_reference", column: "invoice_reference", aliases: ["invoice", "billing_ref", "rechnung"], required: false, group: "club" },
  {
    key: "player_passport_number",
    column: "player_passport_number",
    aliases: ["passport", "spielerpass", "pass_nr"],
    required: false,
    group: "club",
  },
  {
    key: "internal_club_number",
    column: "internal_club_number",
    aliases: ["club_id_number", "member_number", "vereinsnummer", "mitgliedsnummer"],
    required: false,
    recommended: true,
    group: "club",
  },

  { key: "bank_account_holder", column: "bank_account_holder", aliases: ["account_holder", "kontoinhaber"], required: false, group: "financial" },
  { key: "bank_name", column: "bank_name", aliases: ["bank", "kreditinstitut"], required: false, group: "financial" },
  { key: "iban", column: "iban", aliases: ["iban_code"], required: false, group: "financial" },

  {
    key: "emergency_contact_name",
    column: "emergency_contact_name",
    aliases: ["emergency_name", "notfallkontakt_name"],
    required: false,
    recommended: true,
    group: "safety",
  },
  {
    key: "emergency_contact_phone",
    column: "emergency_contact_phone",
    aliases: ["emergency_phone", "notfalltelefon"],
    required: false,
    recommended: true,
    group: "safety",
  },
];

/** Linked members import — not stored on master row */
export const GUARDIAN_IMPORT_COLUMNS = {
  guardian_email: ["guardian_email", "parent_email", "betreuer_email", "sorgeberechtigter_email"],
  ward_email: ["ward_email", "child_email", "player_email", "kind_email"],
} as const;

export function normalizeHeaderKey(raw: string): string {
  return raw
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function buildAliasToKeyMap(): Map<string, keyof ClubMemberMasterRecord> {
  const map = new Map<string, keyof ClubMemberMasterRecord>();
  for (const field of MEMBER_MASTER_FIELDS) {
    map.set(normalizeHeaderKey(field.column), field.key);
    for (const a of field.aliases) map.set(normalizeHeaderKey(a), field.key);
  }
  return map;
}

const aliasToKey = buildAliasToKeyMap();

export function mapHeaderToMasterKey(header: string): keyof ClubMemberMasterRecord | null {
  return aliasToKey.get(normalizeHeaderKey(header)) ?? null;
}

export function parseMembershipKind(raw: string): "active_participant" | "supporting_member" | null {
  const n = normalizeHeaderKey(raw).replace(/_/g, "");
  if (!raw.trim()) return null;
  if (["active", "activeparticipant", "participant", "player", "sport", "aktiv"].includes(n)) return "active_participant";
  if (["supporting", "support", "parent", "sponsor", "begleit", "unterstuetzend"].includes(n)) return "supporting_member";
  return null;
}

export function parseSex(raw: string): ClubMemberMasterRecord["sex"] {
  const n = normalizeHeaderKey(raw);
  if (!raw.trim()) return null;
  if (["male", "m", "man", "herr", "maennlich"].includes(n)) return "male";
  if (["female", "f", "woman", "frau", "weiblich"].includes(n)) return "female";
  if (["other", "diverse", "divers"].includes(n)) return "other";
  if (["prefer_not_to_say", "unknown", "keineangabe"].includes(n)) return "prefer_not_to_say";
  return null;
}

export function parseSide(raw: string): "left" | "right" | "both" | null {
  const n = normalizeHeaderKey(raw);
  if (!raw.trim()) return null;
  if (["left", "l", "links"].includes(n)) return "left";
  if (["right", "r", "rechts"].includes(n)) return "right";
  if (["both", "ambi", "beide"].includes(n)) return "both";
  return null;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}

/** Mandatory fields for registry completeness (baseline). */
export function getMissingRequiredMasterFields(
  row: Partial<ClubMemberMasterRecord>,
  membershipRole: string,
): (keyof ClubMemberMasterRecord)[] {
  const missing: (keyof ClubMemberMasterRecord)[] = [];
  for (const field of MEMBER_MASTER_FIELDS) {
    if (!field.required) continue;
    if (!hasValue(row[field.key])) missing.push(field.key);
  }
  if (membershipRole === "player" && !hasValue(row.birth_date)) {
    if (!missing.includes("birth_date")) missing.push("birth_date");
  }
  return missing;
}

export function masterRecordCompletenessPct(row: Partial<ClubMemberMasterRecord> | null | undefined, membershipRole: string): number {
  const keys = MEMBER_MASTER_FIELDS.map((f) => f.key);
  let filled = 0;
  for (const key of keys) {
    if (hasValue(row?.[key])) filled += 1;
  }
  if (membershipRole === "player" && hasValue(row?.birth_date)) {
    /* birth already counted */
  }
  return Math.round((filled / keys.length) * 100);
}

export function emptyMasterPayload(membershipId: string, clubId: string): Partial<ClubMemberMasterRecord> {
  return {
    membership_id: membershipId,
    club_id: clubId,
    membership_kind: "active_participant",
  };
}

export function parseFlexibleDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const iso = new Date(t);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const dt = new Date(y, mo - 1, d);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  return null;
}

function parseIntSafe(raw: string): number | null {
  const n = Number.parseInt(raw.replace(/\s/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** Map a flat import row (normalized keys → string values) into master record fields. */
export function masterFieldsFromFlatImport(raw: Record<string, string>): Partial<ClubMemberMasterRecord> {
  const out: Partial<ClubMemberMasterRecord> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = mapHeaderToMasterKey(header);
    if (!key || !value.trim()) continue;
    const v = value.trim();
    switch (key) {
      case "sex":
        out.sex = parseSex(v);
        break;
      case "membership_kind": {
        const k = parseMembershipKind(v);
        if (k) out.membership_kind = k;
        break;
      }
      case "birth_date":
      case "club_registration_date":
      case "team_assignment_date":
      case "club_exit_date": {
        const d = parseFlexibleDate(v);
        if (d) (out as Record<string, string | null>)[key] = d;
        break;
      }
      case "height_cm":
      case "weight_kg":
      case "jersey_number":
      case "goals_count": {
        const n = parseIntSafe(v);
        if (n !== null) (out as Record<string, number | null>)[key] = n;
        break;
      }
      case "strong_leg":
      case "strong_hand":
        (out as Record<string, unknown>)[key] = parseSide(v);
        break;
      default:
        (out as Record<string, string | null>)[key] = v;
    }
  }
  return out;
}
