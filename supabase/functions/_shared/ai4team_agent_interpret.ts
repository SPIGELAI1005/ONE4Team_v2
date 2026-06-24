/**
 * Natural-language → workflow intent extraction for AI 4 T Agent.
 * Tuned for EN/DE, voice-style commands, and club timezone-aware scheduling.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { completeChat, type ResolvedLlmCall } from "./llm.ts";
import { parseAgentIntent, type AgentIntent } from "./ai4team_agent_tools.ts";

const MIN_WORKFLOW_CONFIDENCE = 0.68;
const DEFAULT_TRAINING_MINUTES = 90;

export interface ClubAgentContextRow {
  teams: Array<{ id: string; name: string }>;
  upcomingTrainings: Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at?: string | null;
    team_id: string | null;
    team_name?: string | null;
  }>;
}

export interface AgentInterpretOptions {
  timezone?: string;
  isAdmin?: boolean;
}

export type AgentInterpretResult =
  | { kind: "chat" }
  | { kind: "workflow"; intent: AgentIntent; params: Record<string, unknown>; confidence?: number }
  | {
      kind: "clarify";
      intent: AgentIntent;
      field: "reason" | "activity_id";
      question: string;
      params: Record<string, unknown>;
    }
  | { kind: "error"; message: string };

export async function loadClubAgentContext(
  admin: SupabaseClient,
  clubId: string,
): Promise<ClubAgentContextRow> {
  const now = new Date().toISOString();

  const [teamsRes, activitiesRes] = await Promise.all([
    admin.from("teams").select("id, name").eq("club_id", clubId).order("name").limit(50),
    admin
      .from("activities")
      .select("id, title, starts_at, ends_at, team_id, type")
      .eq("club_id", clubId)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(40),
  ]);

  const teams = ((teamsRes.data ?? []) as Array<{ id: string; name: string }>).map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const upcomingTrainings = ((activitiesRes.data ?? []) as Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at?: string | null;
    team_id: string | null;
    type?: string;
  }>)
    .filter((a) => !a.type || a.type === "training")
    .map((a) => ({
      id: a.id,
      title: a.title,
      starts_at: a.starts_at,
      ends_at: a.ends_at ?? null,
      team_id: a.team_id,
      team_name: a.team_id ? teamNameById.get(a.team_id) ?? null : null,
    }));

  return { teams, upcomingTrainings };
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, " ").trim();
}

function resolveTeamId(
  hint: string | null | undefined,
  teams: ClubAgentContextRow["teams"],
): string | null {
  if (!hint?.trim()) return null;
  const raw = hint.trim();
  const exact = teams.find((t) => t.id === raw);
  if (exact) return exact.id;

  const lower = normalizeToken(raw);
  const tokens = lower.split(/\s+/).filter(Boolean);

  let best: { id: string; score: number } | null = null;
  for (const team of teams) {
    const name = normalizeToken(team.name);
    if (name === lower) return team.id;
    if (name.includes(lower) || lower.includes(name)) {
      const score = name.length;
      if (!best || score > best.score) best = { id: team.id, score };
    }
    const nameTokens = name.split(/\s+/);
    const overlap = tokens.filter((t) => nameTokens.some((nt) => nt.includes(t) || t.includes(nt))).length;
    if (overlap > 0) {
      const score = overlap * 10;
      if (!best || score > best.score) best = { id: team.id, score };
    }
  }
  return best?.id ?? null;
}

function zonedParts(date: Date, timezone: string): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function sameCalendarDay(iso: string, ref: Date, timezone: string): boolean {
  const a = zonedParts(new Date(iso), timezone);
  const b = zonedParts(ref, timezone);
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function addDaysInTimezone(ref: Date, days: number, timezone: string): Date {
  const p = zonedParts(ref, timezone);
  const utc = Date.UTC(p.y, p.m - 1, p.d + days, 12, 0, 0);
  return new Date(utc);
}

function resolveActivityId(
  params: Record<string, unknown>,
  upcoming: ClubAgentContextRow["upcomingTrainings"],
  timezone: string,
): string | null {
  if (typeof params.activity_id === "string" && params.activity_id.trim()) {
    const id = params.activity_id.trim();
    if (upcoming.some((a) => a.id === id)) return id;
  }

  const teamId =
    typeof params.team_id === "string" ? params.team_id : null;

  const dateHint =
    typeof params.date_hint === "string"
      ? params.date_hint.toLowerCase()
      : typeof params.relative_date === "string"
        ? params.relative_date.toLowerCase()
        : null;

  const now = new Date();
  let dayFilter: ((a: (typeof upcoming)[0]) => boolean) | null = null;

  if (dateHint) {
    if (/tomorrow|morgen/.test(dateHint)) {
      const tomorrow = addDaysInTimezone(now, 1, timezone);
      dayFilter = (a) => sameCalendarDay(a.starts_at, tomorrow, timezone);
    } else if (/today|heute/.test(dateHint)) {
      dayFilter = (a) => sameCalendarDay(a.starts_at, now, timezone);
    }
  }

  const hint =
    typeof params.activity_hint === "string"
      ? params.activity_hint
      : typeof params.title === "string"
        ? params.title
        : null;

  let candidates = upcoming;
  if (dayFilter) candidates = candidates.filter(dayFilter);
  if (teamId) candidates = candidates.filter((a) => a.team_id === teamId);

  if (hint?.trim()) {
    const lower = hint.toLowerCase();
    const match = candidates.find(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        (a.team_name && a.team_name.toLowerCase().includes(lower)),
    );
    if (match) return match.id;
    return null;
  }

  if (candidates.length === 1) return candidates[0].id;

  return null;
}

function parseIsoOrNull(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function addMinutesIso(startIso: string, minutes: number): string {
  return new Date(new Date(startIso).getTime() + minutes * 60_000).toISOString();
}

function enrichTrainingTimes(params: Record<string, unknown>): Record<string, unknown> {
  const out = { ...params };
  const starts = parseIsoOrNull(out.starts_at);
  if (starts) out.starts_at = starts;
  let ends = parseIsoOrNull(out.ends_at);
  if (starts && !ends) {
    ends = addMinutesIso(starts, DEFAULT_TRAINING_MINUTES);
    out.ends_at = ends;
  } else if (ends) {
    out.ends_at = ends;
  }
  if (!out.title || typeof out.title !== "string" || !String(out.title).trim()) {
    out.title = "Training";
  }
  return out;
}

export function normalizeInterpretedParams(
  intent: AgentIntent,
  raw: Record<string, unknown>,
  ctx: ClubAgentContextRow,
  timezone: string,
): Record<string, unknown> {
  const params = { ...raw };

  if (intent === "create_training" || intent === "plan_training_week") {
    const teamHint =
      (typeof params.team_id === "string" && params.team_id) ||
      (typeof params.team_name === "string" && params.team_name) ||
      (typeof params.team === "string" && params.team) ||
      null;
    const teamId = resolveTeamId(teamHint, ctx.teams);
    if (teamId) params.team_id = teamId;
    delete params.team_name;
    delete params.team;
  }

  if (intent === "create_training") {
    return enrichTrainingTimes(params);
  }

  if (intent === "cancel_training" || intent === "cancel_training_with_parent_notice") {
    const teamHint =
      (typeof params.team_id === "string" && params.team_id) ||
      (typeof params.team_name === "string" && params.team_name) ||
      (typeof params.team === "string" && params.team) ||
      null;
    const teamId = resolveTeamId(teamHint, ctx.teams);
    if (teamId) params.team_id = teamId;
    if (teamHint && !params.team_name) params.team_name = teamHint;

    const activityId = resolveActivityId(params, ctx.upcomingTrainings, timezone);
    if (activityId) {
      params.activity_id = activityId;
      const match = ctx.upcomingTrainings.find((a) => a.id === activityId);
      if (match) {
        params.activity_title = match.title;
        params.starts_at = match.starts_at;
        if (match.team_id) params.team_id = match.team_id;
        if (match.team_name) params.team_name = match.team_name;
      }
    }
    delete params.activity_hint;
    delete params.date_hint;
    delete params.relative_date;
    delete params.team;
    return params;
  }

  if (intent === "plan_training_week" && Array.isArray(params.sessions)) {
    params.sessions = params.sessions
      .filter((s) => s && typeof s === "object")
      .map((s) => {
        const row = s as Record<string, unknown>;
        const teamHint =
          (typeof row.team_id === "string" && row.team_id) ||
          (typeof row.team_name === "string" && row.team_name) ||
          null;
        const teamId = resolveTeamId(teamHint, ctx.teams);
        const enriched = enrichTrainingTimes({
          title: row.title,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          location: row.location ?? params.location ?? null,
        });
        return {
          ...enriched,
          team_id: teamId ?? params.team_id ?? null,
        };
      });
  }

  if (intent === "notify_trainers") {
    if (typeof params.content === "string") params.content = params.content.trim();
    if (typeof params.title === "string") params.title = params.title.trim();
  }

  if (intent === "add_member_draft" && typeof params.email === "string") {
    params.email = params.email.trim().toLowerCase();
  }

  return params;
}

export function validateWorkflowParams(
  intent: AgentIntent,
  params: Record<string, unknown>,
  language: "en" | "de",
  isAdmin: boolean,
): { error: string } | { clarify: { field: "reason" | "activity_id"; question: string } } | null {
  const de = language === "de";

  if (intent === "add_member_draft" && !isAdmin) {
    return { error: de ? "Nur Admins können Mitgliedsentwürfe anlegen." : "Only admins can add member drafts." };
  }

  if (intent === "create_training") {
    if (!parseIsoOrNull(params.starts_at) || !parseIsoOrNull(params.ends_at)) {
      return {
        error: de
          ? "Start- und Endzeit konnten nicht erkannt werden. Bitte Datum und Uhrzeit angeben."
          : "Could not parse start and end time. Please include date and time.",
      };
    }
  }

  if (intent === "cancel_training" || intent === "cancel_training_with_parent_notice") {
    if (!params.activity_id) {
      return {
        clarify: {
          field: "activity_id",
          question: de
            ? "Welches Training soll abgesagt werden? Bitte Team und Datum nennen (z. B. U12-1 morgen)."
            : "Which training should be cancelled? Please name the team and date (e.g. U12-1 tomorrow).",
        },
      };
    }
    const reason = params.reason != null ? String(params.reason).trim() : "";
    if (!reason) {
      return {
        clarify: {
          field: "reason",
          question: de
            ? "Was ist der Grund für die Absage? (z. B. Platz überflutet, zu wenig Spieler)"
            : "What is the reason for cancellation? (e.g. pitch flooded, not enough players)",
        },
      };
    }
  }

  if (intent === "notify_trainers") {
    if (!params.title || !params.content) {
      return { error: de ? "Titel und Text der Ankündigung fehlen." : "Announcement title and message are required." };
    }
  }

  if (intent === "add_member_draft") {
    if (!params.email || typeof params.email !== "string" || !params.email.includes("@")) {
      return { error: de ? "E-Mail-Adresse fehlt oder ist ungültig." : "A valid email address is required." };
    }
  }

  if (intent === "plan_training_week") {
    const sessions = Array.isArray(params.sessions) ? params.sessions : [];
    const valid = sessions.filter(
      (s) => s && typeof s === "object" && parseIsoOrNull((s as Record<string, unknown>).starts_at),
    );
    if (valid.length === 0) {
      return {
        error: de
          ? "Mindestens eine Trainingseinheit mit Datum und Uhrzeit angeben."
          : "Provide at least one session with date and time.",
      };
    }
  }

  return null;
}

function formatNowContext(timezone: string, language: "en" | "de"): Record<string, unknown> {
  const now = new Date();
  const locale = language === "de" ? "de-DE" : "en-GB";
  return {
    now_iso: now.toISOString(),
    timezone,
    local_datetime: now.toLocaleString(locale, { timeZone: timezone }),
    weekday: now.toLocaleDateString(locale, { timeZone: timezone, weekday: "long" }),
  };
}

function fewShotBlock(language: "en" | "de"): string {
  if (language === "de") {
    return `
BEISPIELE:
User: "Lege für U17 am Dienstag 18:00 Training an, Platz 1, 90 Minuten"
→ {"kind":"workflow","confidence":0.95,"intent":"create_training","params":{"team_name":"U17","starts_at":"...(ISO mit Zeitzone)...","ends_at":"...","location":"Platz 1","title":"Training U17"}}

User: "Sag das Training von morgen für die U17 ab"
→ {"kind":"workflow","confidence":0.9,"intent":"cancel_training","params":{"team_name":"U17","date_hint":"tomorrow","activity_hint":"U17","reason":"..."}}

User: "Sag das U12-1 Training ab und informiere die Eltern"
→ {"kind":"workflow","confidence":0.92,"intent":"cancel_training_with_parent_notice","params":{"team_name":"U12-1","date_hint":"tomorrow","activity_hint":"U12-1"}}

User: "Wie können wir die Pressing-Höhe verbessern?"
→ {"kind":"chat"}

User: "Informiere alle Trainer: Hallenbelegung am Freitag geändert"
→ {"kind":"workflow","confidence":0.88,"intent":"notify_trainers","params":{"title":"Hallenbelegung geändert","content":"..."}}`;
  }
  return `
EXAMPLES:
User: "Schedule U17 training next Tuesday 6pm at pitch 1 for 90 minutes"
→ {"kind":"workflow","confidence":0.95,"intent":"create_training","params":{"team_name":"U17","starts_at":"...(ISO)...","ends_at":"...","location":"Pitch 1","title":"U17 training"}}

User: "Cancel tomorrow's U17 training"
→ {"kind":"workflow","confidence":0.9,"intent":"cancel_training","params":{"team_name":"U17","date_hint":"tomorrow","activity_hint":"U17","reason":"..."}}

User: "Cancel U12-1 training and notify parents"
→ {"kind":"workflow","confidence":0.92,"intent":"cancel_training_with_parent_notice","params":{"team_name":"U12-1","date_hint":"tomorrow","activity_hint":"U12-1"}}

User: "How can we improve our pressing shape?"
→ {"kind":"chat"}

User: "Notify trainers the hall booking changed on Friday"
→ {"kind":"workflow","confidence":0.88,"intent":"notify_trainers","params":{"title":"Hall booking update","content":"..."}}`;
}

function buildInterpretSystemPrompt(
  language: "en" | "de",
  ctx: ClubAgentContextRow,
  options: AgentInterpretOptions,
): string {
  const de = language === "de";
  const tz = options.timezone?.trim() || "Europe/Berlin";
  const timeCtx = formatNowContext(tz, language);

  return [
    de
      ? "Du bist der AI 4 T Workflow-Interpreter. Extrahiere aus Trainer-Nachrichten (auch gesprochen/kurz) konkrete Vereinsaktionen."
      : "You are the AI 4 T workflow interpreter. Extract concrete club actions from trainer messages (including spoken/short commands).",
    "",
    de ? "REGELN:" : "RULES:",
    de
      ? "1. kind=workflow nur bei klarer Aktion (anlegen, absagen, planen, ankündigen, Mitgliedsentwurf)."
      : "1. kind=workflow only for clear actions (create, cancel, plan, announce, member draft).",
    de
      ? "2. kind=chat bei Fragen, Taktik, Beratung, Analyse ohne DB-Schreiben."
      : "2. kind=chat for questions, tactics, advice, analysis without DB writes.",
    de
      ? "3. Zeiten als ISO 8601 mit Offset für Zeitzone unten. Relative Daten: heute/today, morgen/tomorrow."
      : "3. Times as ISO 8601 with offset for timezone below. Relative dates: today, tomorrow.",
    de
      ? "4. Endzeit fehlt → Start + 90 Minuten."
      : "4. Missing end time → start + 90 minutes.",
    de
      ? "5. team_name aus Kontext auf team_id abbilden wenn möglich; sonst team_name belassen."
      : "5. Map team_name to known teams; pass team_name if unsure.",
    de
      ? "6. confidence 0.0–1.0; unter 0.68 → kind=chat."
      : "6. confidence 0.0–1.0; below 0.68 → use kind=chat.",
    de
      ? "7. Antwort NUR JSON, kein Markdown."
      : "7. Reply ONLY JSON, no markdown.",
    "",
    de ? "INTENTS:" : "INTENTS:",
    "- create_training",
    "- cancel_training",
    "- cancel_training_with_parent_notice (cancel + club announcement for parents; ask for reason if missing)",
    "- plan_training_week (+ optional announcement)",
    "- duplicate_training_week (copy last week's trainings forward 7 days; team_id required for non-admins)",
    "- notify_trainers",
    "- add_member_draft (admin only)",
    "",
    fewShotBlock(language),
    "",
    de ? "KONTEXT:" : "CONTEXT:",
    JSON.stringify({
      ...timeCtx,
      teams: ctx.teams,
      upcoming_trainings: ctx.upcomingTrainings,
      is_admin: Boolean(options.isAdmin),
    }),
  ].join("\n");
}

export async function interpretAgentMessage(
  creds: ResolvedLlmCall,
  message: string,
  ctx: ClubAgentContextRow,
  language: "en" | "de",
  options: AgentInterpretOptions = {},
): Promise<AgentInterpretResult> {
  const timezone = options.timezone?.trim() || "Europe/Berlin";
  const system = buildInterpretSystemPrompt(language, ctx, { ...options, timezone });

  const result = await completeChat(creds, system, message.trim(), {
    temperature: 0.05,
    maxTokens: 2048,
  });

  if (result.error || !result.text?.trim()) {
    return { kind: "error", message: result.error ?? "Could not interpret message." };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripJsonFence(result.text)) as Record<string, unknown>;
  } catch {
    return { kind: "chat" };
  }

  if (parsed.kind === "chat") return { kind: "chat" };
  if (parsed.kind !== "workflow") return { kind: "chat" };

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? parsed.confidence
      : 0.75;
  if (confidence < MIN_WORKFLOW_CONFIDENCE) return { kind: "chat" };

  const intent = parseAgentIntent(parsed.intent);
  if (!intent) return { kind: "chat" };

  if (intent === "add_member_draft" && !options.isAdmin) {
    return { kind: "chat" };
  }

  const rawParams =
    typeof parsed.params === "object" && parsed.params !== null && !Array.isArray(parsed.params)
      ? (parsed.params as Record<string, unknown>)
      : {};

  const params = normalizeInterpretedParams(intent, rawParams, ctx, timezone);
  const validation = validateWorkflowParams(intent, params, language, Boolean(options.isAdmin));
  if (validation && "error" in validation) {
    return { kind: "error", message: validation.error };
  }
  if (validation && "clarify" in validation) {
    return {
      kind: "clarify",
      intent,
      field: validation.clarify.field,
      question: validation.clarify.question,
      params,
    };
  }

  return { kind: "workflow", intent, params, confidence };
}
