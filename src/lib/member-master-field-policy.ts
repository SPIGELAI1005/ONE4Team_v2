import { MEMBER_MASTER_FIELDS, type ClubMemberMasterRecord } from "@/lib/member-master-schema";

export type MemberMasterEditActor = "self" | "trainer" | "manager";

const SYSTEM_KEYS = new Set<keyof ClubMemberMasterRecord>([
  "membership_id",
  "club_id",
  "created_at",
  "updated_at",
  "photo_uploaded_at",
  "club_pass_generated_at",
  "household_discount_group_id",
  "household_discount_status",
]);

const SELF_EDITABLE_KEYS: (keyof ClubMemberMasterRecord)[] = [
  "first_name",
  "last_name",
  "sex",
  "birth_date",
  "nationality",
  "photo_url",
  "membership_kind",
  "street_line",
  "address_line2",
  "postal_code",
  "city",
  "country",
  "height_cm",
  "weight_kg",
  "strong_leg",
  "strong_hand",
  "shirt_size",
  "shoe_size",
  "jersey_number",
  "emergency_contact_name",
  "emergency_contact_phone",
  "allergies",
  "medical_conditions",
  "medications",
  "medical_notes",
  "bank_account_holder",
  "bank_name",
  "iban",
];

const TRAINER_EXTRA_KEYS: (keyof ClubMemberMasterRecord)[] = [
  "role_development_notes",
  "strengths",
  "goals_count",
  "onboarding_progress",
  "team_integration_status",
  "squad_status",
  "last_evaluation_date",
];

export function editableFieldKeysForActor(actor: MemberMasterEditActor): Set<keyof ClubMemberMasterRecord> {
  if (actor === "manager") {
    return new Set(
      MEMBER_MASTER_FIELDS.map((field) => field.key).filter((key) => !SYSTEM_KEYS.has(key)),
    );
  }
  if (actor === "trainer") {
    return new Set([...SELF_EDITABLE_KEYS, ...TRAINER_EXTRA_KEYS]);
  }
  return new Set(SELF_EDITABLE_KEYS);
}

export function editableGroupsForActor(actor: MemberMasterEditActor): Set<string> {
  if (actor === "manager") {
    return new Set(["identity", "contact", "sport", "performance", "club", "financial", "safety", "clubcard"]);
  }
  if (actor === "trainer") {
    return new Set(["identity", "contact", "sport", "performance", "safety", "clubcard"]);
  }
  return new Set(["identity", "contact", "sport", "financial", "safety", "clubcard"]);
}

export function filterMasterPayloadForActor(
  payload: Partial<ClubMemberMasterRecord>,
  actor: MemberMasterEditActor,
): Partial<ClubMemberMasterRecord> {
  const allowed = editableFieldKeysForActor(actor);
  const out: Partial<ClubMemberMasterRecord> = {};
  for (const [key, value] of Object.entries(payload) as [keyof ClubMemberMasterRecord, unknown][]) {
    if (allowed.has(key)) {
      (out as Record<string, unknown>)[key as string] = value;
    }
  }
  return out;
}

/** Build RPC payload; returns null when nothing editable would be sent (avoids no_editable_fields). */
export function buildMemberMasterSavePayload(
  form: Partial<ClubMemberMasterRecord>,
  actor: MemberMasterEditActor,
): Partial<ClubMemberMasterRecord> | null {
  const payload = filterMasterPayloadForActor(form, actor);
  return Object.keys(payload).length > 0 ? payload : null;
}

export function masterRecordDisplayName(
  master: Partial<ClubMemberMasterRecord> | null | undefined,
  fallback?: string | null,
): string {
  const fromMaster = [master?.first_name, master?.last_name].filter(Boolean).join(" ").trim();
  return fromMaster || fallback?.trim() || "";
}
