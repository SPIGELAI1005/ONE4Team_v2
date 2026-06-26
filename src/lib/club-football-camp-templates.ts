/** Idempotent camp templates for TSV Allach 09 (admin publish → `events` table). */

export interface ClubFootballCampTemplate {
  importKey: string;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  publicSummaryDe: string;
  publicSummaryEn: string;
  targetAudienceDe: string;
  targetAudienceEn: string;
  partnerName: string;
  location: string;
  startsAt: string;
  endsAt: string;
  contactEmail: string;
  registrationUrl: string;
  imagePath: string;
  highlightsDe: string[];
  highlightsEn: string[];
}

export const CLUB_FOOTBALL_CAMP_TEMPLATES: ClubFootballCampTemplate[] = [
  {
    importKey: "tsv-allach-sommer-fussball-camp-2026",
    titleDe: "Sommer Fussball Camp 2026",
    titleEn: "Summer Football Camp 2026",
    descriptionDe:
      "Trainiere mit offiziellen Coaches vom Bologna FC mit einem professionellen Profi-Konzept. Technik, Taktik und Spielformen altersgerecht.\n\nSorglos-Paket: Mittagessen, Snackpausen, Getränke und Camp-Outfit inklusive. Du musst Dich nur um die Anmeldung kümmern.\n\nPartner: Campus Rossoblù (Bologna FC, Serie A).",
    descriptionEn:
      "Train with official Bologna FC coaches using a professional academy concept. Technique, tactics, and game formats matched to age groups.\n\nWorry-free package: lunch, snacks, drinks, and camp kit included. You only handle registration.\n\nPartner: Campus Rossoblù (Bologna FC, Serie A).",
    publicSummaryDe:
      "Gemischt · 03.08. bis 07.08.2026 · Campus Rossoblù × TSV Allach 09 · Enterstr. 55, München",
    publicSummaryEn:
      "Mixed · 3–7 Aug 2026 · Campus Rossoblù × TSV Allach 09 · Enterstr. 55, Munich",
    targetAudienceDe: "Gemischt",
    targetAudienceEn: "Mixed / co-ed",
    partnerName: "Campus Rossoblù · Bologna FC 1909",
    location: "Sportanlage TSV Allach 09, Enterstr. 55, 80999 München",
    startsAt: "2026-08-03T09:00:00+02:00",
    endsAt: "2026-08-07T16:00:00+02:00",
    contactEmail: "info@soccer4kids.com",
    registrationUrl: "https://soccer4kids.com",
    imagePath: "/images/camps/sommer-fussball-camp-2026.png",
    highlightsDe: [
      "Training mit Profi-Coaches",
      "Sorglos-Paket inkl. Verpflegung",
      "Teamgeist und Freude am Fußball",
    ],
    highlightsEn: [
      "Training with pro coaches",
      "All-inclusive care package",
      "Team spirit and joy in football",
    ],
  },
  {
    importKey: "tsv-allach-saison-vorbereitung-camp-2026",
    titleDe: "Saison Vorbereitung Fussball Camp 2026",
    titleEn: "Pre-season Football Camp 2026",
    descriptionDe:
      "Saisonvorbereitung mit Campus Rossoblù: offizielle Bologna-FC-Coaches, Profi-Konzept, Technik und Taktik für Jungs ab U12.\n\nSorglos-Paket mit Mittagessen, Snacks, Getränken und Camp-Outfit. Erfahrene Trainer und Vereinsmanager begleiten die Gruppen.",
    descriptionEn:
      "Pre-season camp with Campus Rossoblù: official Bologna FC coaches, pro concept, technique and tactics for boys U12 and up.\n\nWorry-free package with lunch, snacks, drinks, and camp kit. Experienced coaches and club managers support each group.",
    publicSummaryDe:
      "Jungs ab U12 · 07.09. bis 11.09.2026 · Campus Rossoblù × TSV Allach 09 · Enterstr. 55, München",
    publicSummaryEn:
      "Boys U12+ · 7–11 Sep 2026 · Campus Rossoblù × TSV Allach 09 · Enterstr. 55, Munich",
    targetAudienceDe: "Jungs ab U12",
    targetAudienceEn: "Boys from U12",
    partnerName: "Campus Rossoblù · Bologna FC 1909",
    location: "Sportanlage TSV Allach 09, Enterstr. 55, 80999 München",
    startsAt: "2026-09-07T09:00:00+02:00",
    endsAt: "2026-09-11T16:00:00+02:00",
    contactEmail: "info@soccer4kids.com",
    registrationUrl: "https://soccer4kids.com",
    imagePath: "/images/camps/saison-vorbereitung-camp-2026.png",
    highlightsDe: [
      "Saisonvorbereitung mit Profis",
      "Bologna FC (Serie A) Partner",
      "Vollpension & Camp-Outfit",
    ],
    highlightsEn: [
      "Pre-season with professionals",
      "Bologna FC (Serie A) partner",
      "Full board and camp kit",
    ],
  },
];

export function getClubFootballCampTemplate(importKey: string): ClubFootballCampTemplate | undefined {
  return CLUB_FOOTBALL_CAMP_TEMPLATES.find((t) => t.importKey === importKey);
}
