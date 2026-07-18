import { supabase } from "@/integrations/supabase/client";

export type ClubProgressLevel = "rookie" | "regular" | "core" | "leader" | "legend";

export interface ClubProgressBadge {
  id?: string;
  badge_type: string;
  badge_name: string;
  badge_icon?: string;
  earned_at?: string;
}

export interface MemberProgressSnapshot {
  membership_id: string;
  goals: number;
  assists: number;
  matches: number;
  attended_trainings: number;
  confirmed_trainings: number;
  attendance_streak: number;
  attendance_best_streak: number;
  badges: ClubProgressBadge[];
  xp: number;
  level: ClubProgressLevel;
  level_index: number;
  level_xp_floor: number;
  next_level_xp: number;
  badge_count: number;
  public_badges_opt_in: boolean;
  role: string;
}

export interface TeamChallengeRow {
  team_id: string;
  team_name: string | null;
  anonymous_label: string;
  rate_pct: number;
  session_count: number;
  rank: number;
  is_mine: boolean;
}

export interface TeamAttendanceChallenge {
  window_days: number;
  is_staff: boolean;
  teams: TeamChallengeRow[];
}

export interface PublicOptInBadgeMember {
  membership_id: string;
  display_name: string;
  badges: ClubProgressBadge[];
}

/** XP thresholds aligned with SQL get_member_progress_snapshot. */
export const CLUB_PROGRESS_LEVEL_THRESHOLDS: { level: ClubProgressLevel; xp: number }[] = [
  { level: "rookie", xp: 0 },
  { level: "regular", xp: 25 },
  { level: "core", xp: 75 },
  { level: "leader", xp: 150 },
  { level: "legend", xp: 300 },
];

export function computeProgressXp(input: {
  attendedTrainings: number;
  confirmedTrainings: number;
  matches: number;
  badgeCount: number;
}): number {
  return (
    Math.max(0, input.attendedTrainings) * 2 +
    Math.max(0, input.confirmedTrainings) * 1 +
    Math.max(0, input.matches) * 3 +
    Math.max(0, input.badgeCount) * 5
  );
}

export function levelFromXp(xp: number): {
  level: ClubProgressLevel;
  levelIndex: number;
  floor: number;
  next: number;
  progress01: number;
} {
  let idx = 0;
  for (let i = 0; i < CLUB_PROGRESS_LEVEL_THRESHOLDS.length; i += 1) {
    if (xp >= CLUB_PROGRESS_LEVEL_THRESHOLDS[i].xp) idx = i;
  }
  const floor = CLUB_PROGRESS_LEVEL_THRESHOLDS[idx].xp;
  const next =
    idx + 1 < CLUB_PROGRESS_LEVEL_THRESHOLDS.length
      ? CLUB_PROGRESS_LEVEL_THRESHOLDS[idx + 1].xp
      : floor;
  const span = Math.max(1, next - floor);
  const progress01 = idx + 1 >= CLUB_PROGRESS_LEVEL_THRESHOLDS.length ? 1 : Math.min(1, (xp - floor) / span);
  return {
    level: CLUB_PROGRESS_LEVEL_THRESHOLDS[idx].level,
    levelIndex: idx + 1,
    floor,
    next,
    progress01,
  };
}

export function nextBadgeHint(snapshot: MemberProgressSnapshot): {
  badgeType: string;
  remaining: number;
  metric: "goals" | "assists" | "matches" | "streak" | "rsvp";
} | null {
  const owned = new Set(snapshot.badges.map((b) => b.badge_type));
  const candidates: { badgeType: string; remaining: number; metric: "goals" | "assists" | "matches" | "streak" | "rsvp" }[] = [
    { badgeType: "goals_5", remaining: 5 - snapshot.goals, metric: "goals" },
    { badgeType: "goals_10", remaining: 10 - snapshot.goals, metric: "goals" },
    { badgeType: "assists_5", remaining: 5 - snapshot.assists, metric: "assists" },
    { badgeType: "matches_10", remaining: 10 - snapshot.matches, metric: "matches" },
    { badgeType: "attendance_streak_5", remaining: 5 - snapshot.attendance_streak, metric: "streak" },
    { badgeType: "attendance_streak_10", remaining: 10 - snapshot.attendance_streak, metric: "streak" },
    { badgeType: "rsvp_on_time_5", remaining: 5 - snapshot.confirmed_trainings, metric: "rsvp" },
  ];
  const next = candidates
    .filter((c) => !owned.has(c.badgeType) && c.remaining > 0)
    .sort((a, b) => a.remaining - b.remaining)[0];
  return next ?? null;
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseBadges(raw: unknown): ClubProgressBadge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const badge_type = typeof o.badge_type === "string" ? o.badge_type : "";
      const badge_name = typeof o.badge_name === "string" ? o.badge_name : badge_type;
      if (!badge_type) return null;
      return {
        id: typeof o.id === "string" ? o.id : undefined,
        badge_type,
        badge_name,
        badge_icon: typeof o.badge_icon === "string" ? o.badge_icon : badge_type,
        earned_at: typeof o.earned_at === "string" ? o.earned_at : undefined,
      } satisfies ClubProgressBadge;
    })
    .filter(Boolean) as ClubProgressBadge[];
}

export function parseMemberProgressSnapshot(raw: unknown): MemberProgressSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const levelRaw = typeof o.level === "string" ? o.level : "rookie";
  const level = (
    ["rookie", "regular", "core", "leader", "legend"].includes(levelRaw) ? levelRaw : "rookie"
  ) as ClubProgressLevel;
  return {
    membership_id: typeof o.membership_id === "string" ? o.membership_id : "",
    goals: asNumber(o.goals),
    assists: asNumber(o.assists),
    matches: asNumber(o.matches),
    attended_trainings: asNumber(o.attended_trainings),
    confirmed_trainings: asNumber(o.confirmed_trainings),
    attendance_streak: asNumber(o.attendance_streak),
    attendance_best_streak: asNumber(o.attendance_best_streak),
    badges: parseBadges(o.badges),
    xp: asNumber(o.xp),
    level,
    level_index: asNumber(o.level_index, 1),
    level_xp_floor: asNumber(o.level_xp_floor),
    next_level_xp: asNumber(o.next_level_xp, 25),
    badge_count: asNumber(o.badge_count),
    public_badges_opt_in: o.public_badges_opt_in === true,
    role: typeof o.role === "string" ? o.role : "member",
  };
}

export function emptyMemberProgressSnapshot(
  membershipId: string,
  role = "member",
): MemberProgressSnapshot {
  const levelMeta = levelFromXp(0);
  return {
    membership_id: membershipId,
    goals: 0,
    assists: 0,
    matches: 0,
    attended_trainings: 0,
    confirmed_trainings: 0,
    attendance_streak: 0,
    attendance_best_streak: 0,
    badges: [],
    xp: 0,
    level: levelMeta.level,
    level_index: levelMeta.levelIndex,
    level_xp_floor: levelMeta.floor,
    next_level_xp: levelMeta.next,
    badge_count: 0,
    public_badges_opt_in: false,
    role,
  };
}

export async function fetchMemberProgressSnapshot(
  clubId: string,
  membershipId: string,
  role = "member",
): Promise<{ data: MemberProgressSnapshot; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_member_progress_snapshot", {
    p_club_id: clubId,
    p_membership_id: membershipId,
  });
  if (error) {
    return {
      data: emptyMemberProgressSnapshot(membershipId, role),
      error: new Error(error.message),
    };
  }
  const parsed = parseMemberProgressSnapshot(data);
  if (!parsed) {
    return {
      data: emptyMemberProgressSnapshot(membershipId, role),
      error: null,
    };
  }
  return { data: parsed, error: null };
}

/* ─── Local training journal (client-side until server sync ships) ─── */

export interface TrainingJournalSelfRatings {
  technique: number;
  fitness: number;
  tactics: number;
  mindset: number;
}

export interface TrainingJournalEntry {
  id: string;
  createdAt: string;
  sessionDate: string;
  whatIDid: string;
  improvements: string;
  selfRatings: TrainingJournalSelfRatings;
}

function journalStorageKey(clubId: string, membershipId: string): string {
  return `one4team.trainingJournal.v1.${clubId}.${membershipId}`;
}

export function loadTrainingJournal(clubId: string, membershipId: string): TrainingJournalEntry[] {
  try {
    const raw = localStorage.getItem(journalStorageKey(clubId, membershipId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const id = typeof o.id === "string" ? o.id : "";
        const whatIDid = typeof o.whatIDid === "string" ? o.whatIDid : "";
        const improvements = typeof o.improvements === "string" ? o.improvements : "";
        if (!id) return null;
        const ratings =
          o.selfRatings && typeof o.selfRatings === "object"
            ? (o.selfRatings as Record<string, unknown>)
            : {};
        return {
          id,
          createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
          sessionDate: typeof o.sessionDate === "string" ? o.sessionDate : new Date().toISOString().slice(0, 10),
          whatIDid,
          improvements,
          selfRatings: {
            technique: Math.min(5, Math.max(1, asNumber(ratings.technique, 3))),
            fitness: Math.min(5, Math.max(1, asNumber(ratings.fitness, 3))),
            tactics: Math.min(5, Math.max(1, asNumber(ratings.tactics, 3))),
            mindset: Math.min(5, Math.max(1, asNumber(ratings.mindset, 3))),
          },
        } satisfies TrainingJournalEntry;
      })
      .filter(Boolean) as TrainingJournalEntry[];
  } catch {
    return [];
  }
}

export function saveTrainingJournal(
  clubId: string,
  membershipId: string,
  entries: TrainingJournalEntry[],
): void {
  localStorage.setItem(journalStorageKey(clubId, membershipId), JSON.stringify(entries.slice(0, 40)));
}

export interface TrainingCoachPromptCopy {
  intro: string;
  stats: string;
  journalHeader: string;
  emptyJournal: string;
  entryLine: string;
  outro: string;
  techniqueLabel: string;
  fitnessLabel: string;
  tacticsLabel: string;
  mindsetLabel: string;
}

export function buildTrainingCoachPrompt(input: {
  entries: TrainingJournalEntry[];
  levelLabel: string;
  xp: number;
  streak: number;
  matches: number;
  copy: TrainingCoachPromptCopy;
}): string {
  const { copy } = input;
  const latest = input.entries.slice(0, 3);
  const journalBlock =
    latest.length === 0
      ? copy.emptyJournal
      : latest
          .map((e, i) =>
            copy.entryLine
              .replace("{n}", String(i + 1))
              .replace("{date}", e.sessionDate)
              .replace("{did}", e.whatIDid || "-")
              .replace("{improvements}", e.improvements || "-")
              .replace("{techniqueLabel}", copy.techniqueLabel)
              .replace("{fitnessLabel}", copy.fitnessLabel)
              .replace("{tacticsLabel}", copy.tacticsLabel)
              .replace("{mindsetLabel}", copy.mindsetLabel)
              .replace("{technique}", String(e.selfRatings.technique))
              .replace("{fitness}", String(e.selfRatings.fitness))
              .replace("{tactics}", String(e.selfRatings.tactics))
              .replace("{mindset}", String(e.selfRatings.mindset)),
          )
          .join("\n\n");
  return [
    copy.intro,
    copy.stats
      .replace("{level}", input.levelLabel)
      .replace("{xp}", String(input.xp))
      .replace("{streak}", String(input.streak))
      .replace("{matches}", String(input.matches)),
    copy.journalHeader,
    journalBlock,
    copy.outro,
  ].join("\n\n");
}


export async function fetchTeamAttendanceChallenge(
  clubId: string,
  windowDays = 30,
): Promise<{ data: TeamAttendanceChallenge | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_team_attendance_challenge", {
    p_club_id: clubId,
    p_window_days: windowDays,
  });
  if (error) return { data: null, error: new Error(error.message) };
  if (!data || typeof data !== "object") return { data: null, error: null };
  const o = data as Record<string, unknown>;
  const teamsRaw = Array.isArray(o.teams) ? o.teams : [];
  const teams: TeamChallengeRow[] = teamsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const team_id = typeof r.team_id === "string" ? r.team_id : "";
      if (!team_id) return null;
      return {
        team_id,
        team_name: typeof r.team_name === "string" ? r.team_name : null,
        anonymous_label: typeof r.anonymous_label === "string" ? r.anonymous_label : "Team",
        rate_pct: asNumber(r.rate_pct),
        session_count: asNumber(r.session_count),
        rank: asNumber(r.rank, 99),
        is_mine: r.is_mine === true,
      };
    })
    .filter(Boolean) as TeamChallengeRow[];
  return {
    data: {
      window_days: asNumber(o.window_days, windowDays),
      is_staff: o.is_staff === true,
      teams,
    },
    error: null,
  };
}

export async function setPublicBadgesOptIn(
  clubId: string,
  optIn: boolean,
): Promise<{ ok: boolean; error: Error | null }> {
  const { error } = await supabase.rpc("set_public_badges_opt_in", {
    p_club_id: clubId,
    p_opt_in: optIn,
  });
  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, error: null };
}

export async function fetchPublicOptInBadges(
  clubId: string,
): Promise<{ data: PublicOptInBadgeMember[]; error: Error | null }> {
  const { data, error } = await supabase.rpc("list_public_opt_in_badges", {
    p_club_id: clubId,
  });
  if (error) return { data: [], error: new Error(error.message) };
  if (!Array.isArray(data)) return { data: [], error: null };
  const rows = data
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const membership_id = typeof o.membership_id === "string" ? o.membership_id : "";
      if (!membership_id) return null;
      return {
        membership_id,
        display_name: typeof o.display_name === "string" ? o.display_name : "Member",
        badges: parseBadges(o.badges),
      };
    })
    .filter(Boolean) as PublicOptInBadgeMember[];
  return { data: rows, error: null };
}

/** Roles allowed to opt into public badge showcase (not youth players). */
export function canOptInPublicBadges(role: string | null | undefined): boolean {
  const r = (role || "").toLowerCase();
  return r === "member" || r === "trainer" || r === "club_admin" || r === "admin" || r === "parent";
}
