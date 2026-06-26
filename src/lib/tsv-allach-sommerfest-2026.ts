export const SOMMERFEST_DATE = "2026-07-11";
export const SOMMERFEST_LOCATION = "Sportanlage TSV Allach 09, Enterstr. 55, 80999 München";
export const SOMMERFEST_POSTER_PATH = "/images/sommerfest/poster-2026.png";

export type SommerfestPitchId = "platz-1" | "platz-2" | "kompaktfeld" | "aussenfeld" | "hauptplatz" | "clubhaus";

export type SommerfestMatchCategory = "kleinfeld" | "kompaktfeld" | "damen" | "herren";

export interface SommerfestMatch {
  id: string;
  time: string;
  pitchId: SommerfestPitchId;
  pitchLabel: string;
  homeTeam: string;
  awayTeam: string;
  category: SommerfestMatchCategory;
  durationLabelKey: "kleinfeld" | "kompaktfeld" | "damen" | "herren";
}

export interface SommerfestFeedItem {
  id: string;
  kind: "festival" | "tournament" | "news" | "evening" | "pitch_booking" | "club_wide";
  time: string;
  endTime?: string;
  titleDe: string;
  titleEn: string;
  summaryDe?: string;
  summaryEn?: string;
  bodyDe?: string;
  bodyEn?: string;
  pitchId?: SommerfestPitchId;
  pitchLabel?: string;
  teamScope?: string | null;
  authorDe?: string;
  authorEn?: string;
  accent: "green" | "yellow" | "pink" | "neutral" | "rose";
}

export const SOMMERFEST_MATCHES: SommerfestMatch[] = [
  { id: "m01", time: "11:00", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U7-3", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m02", time: "11:00", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U7-2", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m03", time: "11:30", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U7-1", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m04", time: "11:30", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U8-3", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m05", time: "12:00", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U8-2/2", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m06", time: "12:00", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U8-2/1", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m07", time: "12:30", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U8-1/2", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m08", time: "12:30", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U8-1/1", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m09", time: "13:00", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U9-3", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m10", time: "13:00", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U9-2", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m11", time: "13:30", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U9-1", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m12", time: "13:30", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U10-4", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m13", time: "14:00", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U10-3", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m14", time: "14:00", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U10-2", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m15", time: "14:00", pitchId: "kompaktfeld", pitchLabel: "Kompaktfeld", homeTeam: "U11-1", awayTeam: "U12-3", category: "kompaktfeld", durationLabelKey: "kompaktfeld" },
  { id: "m16", time: "14:30", pitchId: "platz-1", pitchLabel: "Platz 1", homeTeam: "U10-1", awayTeam: "Eltern", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m17", time: "14:30", pitchId: "platz-2", pitchLabel: "Platz 2", homeTeam: "U11-2", awayTeam: "U11-3", category: "kleinfeld", durationLabelKey: "kleinfeld" },
  { id: "m18", time: "15:00", pitchId: "kompaktfeld", pitchLabel: "Kompaktfeld", homeTeam: "U12-2", awayTeam: "U13-2", category: "kompaktfeld", durationLabelKey: "kompaktfeld" },
  { id: "m19", time: "15:30", pitchId: "aussenfeld", pitchLabel: "Außenfeld", homeTeam: "TSV Allach Damen", awayTeam: "TSV Allach Damen", category: "damen", durationLabelKey: "damen" },
  { id: "m20", time: "16:00", pitchId: "kompaktfeld", pitchLabel: "Kompaktfeld", homeTeam: "U12-1", awayTeam: "U13-1", category: "kompaktfeld", durationLabelKey: "kompaktfeld" },
  { id: "m21", time: "16:45", pitchId: "hauptplatz", pitchLabel: "Hauptplatz", homeTeam: "TSV Allach 1", awayTeam: "TSV Gerberau", category: "herren", durationLabelKey: "herren" },
  { id: "m22", time: "18:00", pitchId: "hauptplatz", pitchLabel: "Hauptplatz", homeTeam: "TSV Allach 2", awayTeam: "Husaria München", category: "herren", durationLabelKey: "herren" },
];

export const SOMMERFEST_FEED: SommerfestFeedItem[] = [
  {
    id: "feed-open",
    kind: "festival",
    time: "11:00",
    endTime: "18:30",
    titleDe: "Sommerfest beim TSV Allach 09",
    titleEn: "Summer Festival at TSV Allach 09",
    summaryDe: "Spiel, Spaß & Gemeinschaft für alle: Kinder-Eltern-Turnier, Mannschaftsspiele, Essen & Getränke.",
    summaryEn: "Play, fun & community for everyone: parent-child tournament, team matches, food & drinks.",
    bodyDe:
      "Am 11. Juli 2026 feiern wir unser Sommerfest auf der gesamten Sportanlage in der Enterstr. 55.\n\nTagsüber ab 11 Uhr: Kinder-Eltern-Turnier, Spiele der Jugend- und Erwachsenenmannschaften, Essen und Getränke für Groß und Klein.\n\nAbends ab 19 Uhr: Allacher Sommerglühen mit DJ, kühlen Drinks und Lagerfeuer.\n\nWir freuen uns auf euch!",
    bodyEn:
      "On 11 July 2026 we celebrate our summer festival across the full grounds at Enterstr. 55.\n\nFrom 11:00: parent-child tournament, youth and adult team matches, food and drinks for all ages.\n\nFrom 19:00: Allach Summer Glow with DJ, cool drinks, and campfire.\n\nWe look forward to seeing you!",
    pitchId: "clubhaus",
    pitchLabel: "Gesamte Sportanlage",
    teamScope: null,
    accent: "yellow",
  },
  {
    id: "feed-news-heat",
    kind: "news",
    time: "08:30",
    titleDe: "Training entfällt: Hitzewarnung BFV",
    titleEn: "Training cancelled: BFV heat warning",
    summaryDe: "Training fällt voraussichtlich bis Montag aus. BFV hat Spiele am Wochenende abgesagt.",
    summaryEn: "Training is expected to be cancelled until Monday. BFV has called off weekend fixtures.",
    bodyDe:
      "Liebe Eltern, liebe Spielerinnen und Spieler,\n\naufgrund der aktuellen Situation möchten wir Euch darüber informieren, dass das Training von heute bis voraussichtlich Montag ausfällt. Hintergrund ist unter anderem, dass auch der Bayerische Fußball-Verband (BFV) alle Spiele für das kommende Wochenende wegen der Hitzewarnung abgesagt hat.\n\nWir bitten um Euer Verständnis und hoffen, dass wir ab Dienstag wieder wie gewohnt starten können. Bei Fragen stehen wir Euch selbstverständlich gerne zur Verfügung.\n\nVielen Dank für Eure Unterstützung und bleibt gesund.\n\nSportliche Grüße\nEure TSV Allach 09 Familie",
    bodyEn:
      "Dear parents, dear players,\n\nDue to the current situation we would like to inform you that training is cancelled from today until Monday at the earliest. Among other reasons, the Bavarian Football Association (BFV) has called off all matches this weekend because of the heat warning.\n\nThank you for your understanding. We hope to resume as usual from Tuesday. Please contact us if you have any questions.\n\nStay healthy.\n\nSporting regards,\nYour TSV Allach 09 family",
    authorDe: "Kurt Mexner · Jugendleiter",
    authorEn: "Kurt Mexner · Youth coordinator",
    teamScope: null,
    accent: "rose",
  },
  {
    id: "feed-kleinfeld",
    kind: "tournament",
    time: "11:00",
    endTime: "15:00",
    titleDe: "Kinder-Eltern-Turnier · Junioren Kleinfeld",
    titleEn: "Parent-child tournament · Youth small pitches",
    summaryDe: "Platz 1 & Platz 2 · Spielzeit 25 Minuten.",
    summaryEn: "Pitch 1 & 2 · 25 minute games.",
    pitchId: "platz-1",
    pitchLabel: "Platz 1 & 2",
    teamScope: "Jugend U7–U11",
    accent: "green",
  },
  {
    id: "feed-kompakt",
    kind: "tournament",
    time: "14:00",
    endTime: "16:30",
    titleDe: "Junioren-Turnier · Kompaktfeld",
    titleEn: "Youth tournament · Compact pitch",
    summaryDe: "U11–U13 · Spielzeit 2 × 25 Minuten.",
    summaryEn: "U11–U13 · 2 × 25 minutes.",
    pitchId: "kompaktfeld",
    pitchLabel: "Kompaktfeld",
    teamScope: "U11 · U12 · U13",
    accent: "green",
  },
  {
    id: "feed-damen",
    kind: "pitch_booking",
    time: "15:30",
    endTime: "16:30",
    titleDe: "Damen · Freundschaftsspiel",
    titleEn: "Women's friendly",
    summaryDe: "Außenfeld reserviert · 2 × 25 Minuten.",
    summaryEn: "Outer pitch reserved · 2 × 25 minutes.",
    pitchId: "aussenfeld",
    pitchLabel: "Außenfeld",
    teamScope: "Damen",
    accent: "green",
  },
  {
    id: "feed-herren",
    kind: "pitch_booking",
    time: "16:45",
    endTime: "19:00",
    titleDe: "Herren · Großfeld Hauptplatz",
    titleEn: "Men's · Main full-size pitch",
    summaryDe: "TSV Allach 1 & 2 · Spielzeit 2 × 30 Minuten.",
    summaryEn: "TSV Allach 1 & 2 · 2 × 30 minutes.",
    pitchId: "hauptplatz",
    pitchLabel: "Hauptplatz",
    teamScope: "Herren",
    accent: "green",
  },
  {
    id: "feed-evening",
    kind: "evening",
    time: "19:00",
    endTime: "23:00",
    titleDe: "Allacher Sommerglühen",
    titleEn: "Allach Summer Glow",
    summaryDe: "Tropical Vibes · DJ · Getränke · Lagerfeuer. Die Sommernacht im Verein.",
    summaryEn: "Tropical vibes · DJ · drinks · campfire. The club summer night.",
    pitchId: "clubhaus",
    pitchLabel: "Festwiese & Clubhaus",
    teamScope: null,
    accent: "pink",
  },
];

export const SOMMERFEST_PITCHES: { id: SommerfestPitchId; labelDe: string; labelEn: string }[] = [
  { id: "platz-1", labelDe: "Platz 1", labelEn: "Pitch 1" },
  { id: "platz-2", labelDe: "Platz 2", labelEn: "Pitch 2" },
  { id: "kompaktfeld", labelDe: "Kompaktfeld", labelEn: "Compact pitch" },
  { id: "aussenfeld", labelDe: "Außenfeld", labelEn: "Outer pitch" },
  { id: "hauptplatz", labelDe: "Hauptplatz", labelEn: "Main pitch" },
  { id: "clubhaus", labelDe: "Clubhaus & Festwiese", labelEn: "Clubhouse & festival lawn" },
];

export function sommerfestMatchesByCategory(category: SommerfestMatchCategory | "all"): SommerfestMatch[] {
  if (category === "all") return SOMMERFEST_MATCHES;
  return SOMMERFEST_MATCHES.filter((m) => m.category === category);
}

export function sommerfestMatchesByPitch(pitchId: SommerfestPitchId | "all"): SommerfestMatch[] {
  if (pitchId === "all") return SOMMERFEST_MATCHES;
  return SOMMERFEST_MATCHES.filter((m) => m.pitchId === pitchId);
}

export function sommerfestFeedSorted(): SommerfestFeedItem[] {
  return [...SOMMERFEST_FEED].sort((a, b) => a.time.localeCompare(b.time));
}
