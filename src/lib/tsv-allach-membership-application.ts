export type AllachApplicantType = "self" | "child";
export type AllachSalutation = "frau" | "herr";
export type AllachYesNo = "yes" | "no";

export interface TsvAllachMembershipApplication {
  version: 1;
  applicantType: AllachApplicantType;
  salutation: AllachSalutation | "";
  firstName: string;
  lastName: string;
  childFullName: string;
  birthDate: string;
  birthPlace: string;
  phoneCountryCode: string;
  mobilePhone: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  playedInClubBefore: AllachYesNo | "";
  previousClubName: string;
  currentlyClubPlayer: AllachYesNo | "";
  playerPassNumber: string;
  lastGameDate: string;
  terminationSubmitted: AllachYesNo | "";
  membershipType: string;
  additionalComments: string;
  voucherCode: string;
  accountHolder: string;
  iban: string;
  bankName: string;
  consentSepa: boolean;
  consentRegistrationFee: boolean;
  consentStatutes: boolean;
  consentMembershipInfo: boolean;
  consentPrivacy: boolean;
}

export const ALLACH_MEMBERSHIP_TYPES = [
  "youth",
  "adult_active",
  "adult_passive",
  "family",
] as const;

export type AllachMembershipTypeId = (typeof ALLACH_MEMBERSHIP_TYPES)[number];

/** Annual membership fees in EUR (plus one-time registration fee). */
export const ALLACH_MEMBERSHIP_ANNUAL_FEES_EUR: Record<AllachMembershipTypeId, number> = {
  youth: 120,
  adult_active: 180,
  adult_passive: 90,
  family: 240,
};

/** One-time Aufnahmegebühr / registration fee in EUR. */
export const ALLACH_MEMBERSHIP_REGISTRATION_FEE_EUR = 30;

export function formatAllachMembershipFeeLabel(
  typeId: AllachMembershipTypeId,
  language: "en" | "de" = "de",
): string {
  const annual = ALLACH_MEMBERSHIP_ANNUAL_FEES_EUR[typeId];
  return language === "de" ? `${annual} € / Jahr` : `€${annual} / year`;
}

export const ALLACH_PHONE_CODES = [
  { id: "DE", dial: "+49", label: "DE +49" },
  { id: "AT", dial: "+43", label: "AT +43" },
  { id: "CH", dial: "+41", label: "CH +41" },
] as const;

export const ALLACH_COUNTRIES = ["DE", "AT", "CH"] as const;

export function emptyTsvAllachMembershipApplication(email = ""): TsvAllachMembershipApplication {
  return {
    version: 1,
    applicantType: "child",
    salutation: "",
    firstName: "",
    lastName: "",
    childFullName: "",
    birthDate: "",
    birthPlace: "",
    phoneCountryCode: "DE",
    mobilePhone: "",
    email,
    street: "",
    postalCode: "",
    city: "",
    country: "DE",
    playedInClubBefore: "",
    previousClubName: "",
    currentlyClubPlayer: "",
    playerPassNumber: "",
    lastGameDate: "",
    terminationSubmitted: "",
    membershipType: "",
    additionalComments: "",
    voucherCode: "",
    accountHolder: "",
    iban: "",
    bankName: "",
    consentSepa: false,
    consentRegistrationFee: false,
    consentStatutes: false,
    consentMembershipInfo: false,
    consentPrivacy: false,
  };
}

export function formatAllachPhone(app: TsvAllachMembershipApplication): string | null {
  const mobile = app.mobilePhone.trim();
  if (!mobile) return null;
  const dial = ALLACH_PHONE_CODES.find((c) => c.id === app.phoneCountryCode)?.dial ?? "+49";
  return `${dial} ${mobile}`;
}

export function allachInterestedRole(app: TsvAllachMembershipApplication): string {
  return app.applicantType === "child" ? "parent" : "player";
}

export function allachInterestedTeam(app: TsvAllachMembershipApplication): string | null {
  if (app.applicantType === "child") {
    const child = app.childFullName.trim();
    return child || null;
  }
  return null;
}

export function buildAllachApplicationMessage(app: TsvAllachMembershipApplication): string {
  const lines = [
    `Application type: ${app.applicantType === "child" ? "Child / youth" : "Self"}`,
    app.applicantType === "child" && app.childFullName.trim() ? `Child: ${app.childFullName.trim()}` : null,
    app.membershipType ? `Membership: ${app.membershipType}` : null,
    app.street.trim() ? `Address: ${app.street.trim()}, ${app.postalCode.trim()} ${app.city.trim()}, ${app.country}` : null,
    app.additionalComments.trim() ? `Notes: ${app.additionalComments.trim()}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function applicationPayloadForRpc(app: TsvAllachMembershipApplication): Record<string, unknown> {
  return { ...app, schema: "tsv-allach-onlineanmeldung-v1" };
}
