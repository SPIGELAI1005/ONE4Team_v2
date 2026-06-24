/**
 * AI 4 T Agent — intent proposals and RPC execution (Phases 0–3).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AgentIntent =
  | "create_training"
  | "cancel_training"
  | "cancel_training_with_parent_notice"
  | "add_member_draft"
  | "send_club_announcement"
  | "plan_training_week"
  | "duplicate_training_week"
  | "notify_trainers";

export interface TeamTrainerSuggestion {
  membership_id: string;
  display_name: string;
  email: string;
}

export interface TrainingScopeValidation {
  allowed: boolean;
  code: string;
  activity_id?: string;
  team_id?: string | null;
  team_name?: string | null;
  activity_title?: string;
  starts_at?: string;
  suggested_trainers?: TeamTrainerSuggestion[];
}

export interface AgentPageContext {
  source?: string;
  entityType?: string;
  entityId?: string;
  teamId?: string;
  teamName?: string;
  extra?: Record<string, unknown>;
}

export interface AgentProposalStep {
  tool: string;
  label: string;
  params: Record<string, unknown>;
}

export interface AgentProposalPayload {
  title: string;
  summary: string;
  steps: AgentProposalStep[];
  warnings?: string[];
}

interface SessionInput {
  title?: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  team_id?: string | null;
}

export async function assertClubTrainer(
  admin: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("is_club_trainer", { _user_id: userId, _club_id: clubId });
  if (error) {
    console.error("is_club_trainer:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function assertClubAdmin(
  admin: SupabaseClient,
  userId: string,
  clubId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("is_club_admin", { _user_id: userId, _club_id: clubId });
  if (error) {
    console.error("is_club_admin:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function validateTrainingScope(
  admin: SupabaseClient,
  clubId: string,
  userId: string,
  activityId: string,
): Promise<TrainingScopeValidation> {
  const { data, error } = await admin.rpc("agent_validate_training_scope", {
    _club_id: clubId,
    _user_id: userId,
    _activity_id: activityId,
  });
  if (error) {
    console.error("agent_validate_training_scope:", error.message);
    return { allowed: false, code: "validation_error" };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    allowed: Boolean(row.allowed),
    code: String(row.code ?? "unknown"),
    activity_id: row.activity_id != null ? String(row.activity_id) : undefined,
    team_id: row.team_id != null ? String(row.team_id) : row.team_id === null ? null : undefined,
    team_name: row.team_name != null ? String(row.team_name) : null,
    activity_title: row.activity_title != null ? String(row.activity_title) : undefined,
    starts_at: row.starts_at != null ? String(row.starts_at) : undefined,
    suggested_trainers: Array.isArray(row.suggested_trainers)
      ? (row.suggested_trainers as TeamTrainerSuggestion[])
      : [],
  };
}

export function intentsRequiringTrainingScope(intent: AgentIntent): boolean {
  return intent === "cancel_training" || intent === "cancel_training_with_parent_notice";
}

function buildParentNoticeCopy(
  params: Record<string, unknown>,
  language: "en" | "de",
): { title: string; content: string } {
  const de = language === "de";
  const teamName = params.team_name != null ? String(params.team_name) : "";
  const activityTitle = params.activity_title != null ? String(params.activity_title) : "Training";
  const reason = params.reason != null ? String(params.reason).trim() : "";
  const title = teamName
    ? de
      ? `${teamName}: Training abgesagt`
      : `${teamName}: Training cancelled`
    : de
      ? "Training abgesagt"
      : "Training cancelled";
  const content = de
    ? `Das Training „${activityTitle}“${teamName ? ` (${teamName})` : ""} entfällt.${reason ? ` Grund: ${reason}` : ""}`
    : `Training "${activityTitle}"${teamName ? ` (${teamName})` : ""} is cancelled.${reason ? ` Reason: ${reason}` : ""}`;
  return { title, content };
}

export function parseAgentIntent(raw: unknown): AgentIntent | null {
  const allowed: AgentIntent[] = [
    "create_training",
    "cancel_training",
    "cancel_training_with_parent_notice",
    "add_member_draft",
    "send_club_announcement",
    "plan_training_week",
    "duplicate_training_week",
    "notify_trainers",
  ];
  if (typeof raw === "string" && allowed.includes(raw as AgentIntent)) {
    return raw as AgentIntent;
  }
  return null;
}

export function intentRequiresAdmin(intent: AgentIntent): boolean {
  return intent === "add_member_draft";
}

function parseSessions(raw: unknown): SessionInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === "object")
    .map((s) => s as Record<string, unknown>)
    .filter((s) => typeof s.starts_at === "string" && typeof s.ends_at === "string")
    .map((s) => ({
      title: typeof s.title === "string" ? s.title : "Training",
      starts_at: String(s.starts_at),
      ends_at: String(s.ends_at),
      location: s.location != null ? String(s.location) : null,
      team_id: s.team_id != null ? String(s.team_id) : null,
    }));
}

function formatTrainingWhen(iso: string, language: "en" | "de"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = language === "de" ? "de-DE" : "en-GB";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function cancelTrainingDisplay(params: Record<string, unknown>, language: "en" | "de") {
  const de = language === "de";
  const teamName = params.team_name != null ? String(params.team_name).trim() : "";
  const activityTitle =
    params.activity_title != null
      ? String(params.activity_title).trim()
      : params.title != null
        ? String(params.title).trim()
        : de
          ? "Training"
          : "Training";
  const startsRaw =
    typeof params.starts_at === "string"
      ? params.starts_at
      : typeof params.activity_starts_at === "string"
        ? params.activity_starts_at
        : "";
  const when = startsRaw ? formatTrainingWhen(startsRaw, language) : "";
  const headlineParts = [teamName, activityTitle, when].filter(Boolean);
  const headline = headlineParts.length > 0 ? headlineParts.join(" · ") : activityTitle;
  const reason = params.reason != null ? String(params.reason).trim() : "";
  return { teamName, activityTitle, when, headline, reason, startsRaw };
}

function cancelTrainingStepParams(
  activityId: string,
  params: Record<string, unknown>,
  reason: string | null,
): Record<string, unknown> {
  const display = cancelTrainingDisplay(params, "en");
  return {
    activity_id: activityId,
    reason,
    team_name: display.teamName || null,
    activity_title: display.activityTitle,
    starts_at: display.startsRaw || null,
  };
}

export function buildProposalFromIntent(
  intent: AgentIntent,
  params: Record<string, unknown>,
  language: "en" | "de",
): AgentProposalPayload {
  const de = language === "de";

  if (intent === "create_training") {
    const title = String(params.title ?? "Training");
    const starts = String(params.starts_at ?? "");
    const ends = String(params.ends_at ?? "");
    const location = params.location != null ? String(params.location) : "";
    const teamId = params.team_id != null ? String(params.team_id) : null;
    return {
      title: de ? "Training anlegen" : "Create training",
      summary: de
        ? `Training „${title}“ von ${starts} bis ${ends}${location ? ` · ${location}` : ""}.`
        : `Training "${title}" from ${starts} to ${ends}${location ? ` · ${location}` : ""}.`,
      steps: [
        {
          tool: "create_training",
          label: de ? "Training in den Vereinskalender eintragen" : "Add training to club schedule",
          params: { team_id: teamId, title, starts_at: starts, ends_at: ends, location: location || null },
        },
      ],
    };
  }

  if (intent === "cancel_training") {
    const activityId = String(params.activity_id ?? "").trim();
    if (!activityId) {
      throw new Error(
        de
          ? "Keine Trainingseinheit gefunden. Bitte Team und Datum genauer angeben."
          : "No training session matched. Please specify the team and date more clearly.",
      );
    }
    const display = cancelTrainingDisplay(params, language);
    const reason = display.reason;
    return {
      title: de ? "Training absagen" : "Cancel training",
      summary: de
        ? `Folgende Einheit wird abgesagt: ${display.headline}.${reason ? ` Grund: ${reason}` : ""}`
        : `The following session will be cancelled: ${display.headline}.${reason ? ` Reason: ${reason}` : ""}`,
      steps: [
        {
          tool: "cancel_training",
          label: de
            ? `Einheit absagen: ${display.headline}`
            : `Cancel session: ${display.headline}`,
          params: cancelTrainingStepParams(activityId, params, reason || null),
        },
      ],
      warnings: [de ? "Diese Aktion kann nicht rückgängig gemacht werden." : "This action cannot be undone."],
    };
  }

  if (intent === "cancel_training_with_parent_notice") {
    const activityId = String(params.activity_id ?? "").trim();
    if (!activityId) {
      throw new Error(
        de
          ? "Keine Trainingseinheit gefunden. Bitte Team und Datum genauer angeben."
          : "No training session matched. Please specify the team and date more clearly.",
      );
    }
    const display = cancelTrainingDisplay(params, language);
    const reason = display.reason;
    const notice = buildParentNoticeCopy(params, language);
    return {
      title: de ? "Training absagen & Eltern informieren" : "Cancel training & notify parents",
      summary: de
        ? `Folgende Einheit wird abgesagt: ${display.headline}. Eltern erhalten eine Vereinsankündigung.${reason ? ` Grund: ${reason}` : ""}`
        : `The following session will be cancelled: ${display.headline}. Parents will receive a club announcement.${reason ? ` Reason: ${reason}` : ""}`,
      steps: [
        {
          tool: "cancel_training",
          label: de
            ? `Einheit absagen: ${display.headline}`
            : `Cancel session: ${display.headline}`,
          params: cancelTrainingStepParams(activityId, params, reason || null),
        },
        {
          tool: "send_club_announcement",
          label: de ? "Eltern per Vereinsankündigung informieren" : "Notify parents via club announcement",
          params: {
            title: params.parent_notice_title != null ? String(params.parent_notice_title) : notice.title,
            content: params.parent_notice_content != null ? String(params.parent_notice_content) : notice.content,
            priority: "normal",
          },
        },
      ],
      warnings: [de ? "Diese Aktion kann nicht rückgängig gemacht werden." : "This action cannot be undone."],
    };
  }

  if (intent === "add_member_draft") {
    const email = String(params.email ?? "");
    const name = params.name != null ? String(params.name) : "";
    return {
      title: de ? "Mitglied als Entwurf anlegen" : "Add member draft",
      summary: de
        ? `Entwurf für ${email}${name ? ` (${name})` : ""} in der Mitgliederliste speichern (noch keine Einladung).`
        : `Save draft for ${email}${name ? ` (${name})` : ""} on the member list (invite not sent yet).`,
      steps: [
        {
          tool: "create_member_draft",
          label: de ? "Entwurf in Mitgliederliste speichern" : "Save draft to member list",
          params: {
            email,
            name: name || null,
            role: params.role != null ? String(params.role) : "member",
            team: params.team != null ? String(params.team) : null,
            position: params.position != null ? String(params.position) : null,
          },
        },
      ],
    };
  }

  if (intent === "send_club_announcement" || intent === "notify_trainers") {
    const title = String(params.title ?? (de ? "Hinweis für Trainer" : "Note for trainers"));
    const content = String(params.content ?? "");
    return {
      title: de ? "Vereinsankündigung senden" : "Post club announcement",
      summary: de ? `Ankündigung „${title}“ im Verein veröffentlichen.` : `Publish announcement "${title}" in the club.`,
      steps: [
        {
          tool: "send_club_announcement",
          label: de ? "Ankündigung veröffentlichen" : "Publish announcement",
          params: {
            title,
            content,
            priority: params.priority != null ? String(params.priority) : "normal",
          },
        },
      ],
    };
  }

  if (intent === "plan_training_week" || intent === "duplicate_training_week") {
    const teamId = params.team_id != null ? String(params.team_id) : null;
    const location = params.location != null ? String(params.location) : null;
    const sessions = parseSessions(params.sessions);
    if (sessions.length === 0) {
      const emptyMsg =
        intent === "duplicate_training_week"
          ? de
            ? "Keine Trainingseinheiten in der Vorwoche gefunden."
            : "No training sessions found in the previous week."
          : de
            ? "Mindestens eine Trainingseinheit angeben."
            : "Provide at least one training session.";
      throw new Error(emptyMsg);
    }

    const steps: AgentProposalStep[] = sessions.map((s, i) => ({
      tool: "create_training",
      label: de ? `Training ${i + 1} anlegen` : `Create training ${i + 1}`,
      params: {
        team_id: s.team_id ?? teamId,
        title: s.title ?? "Training",
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        location: s.location ?? location,
      },
    }));

    const ann = params.announcement as Record<string, unknown> | undefined;
    if (ann && typeof ann.title === "string" && typeof ann.content === "string") {
      steps.push({
        tool: "send_club_announcement",
        label: de ? "Trainer per Ankündigung informieren" : "Notify trainers via announcement",
        params: {
          title: ann.title,
          content: ann.content,
          priority: "normal",
        },
      });
    }

    const isDuplicate = intent === "duplicate_training_week";
    const shift = params.days_shift != null ? Number(params.days_shift) : 7;
    return {
      title: isDuplicate
        ? de
          ? "Trainingswoche duplizieren"
          : "Duplicate training week"
        : de
          ? "Trainingswoche planen"
          : "Plan training week",
      summary: isDuplicate
        ? de
          ? `${sessions.length} Training(s) aus der Vorwoche um ${shift} Tage verschoben${steps.length > sessions.length ? " + Ankündigung" : ""}.`
          : `${sessions.length} session(s) copied from last week (+${shift} days)${steps.length > sessions.length ? " + announcement" : ""}.`
        : de
          ? `${sessions.length} Training(s)${steps.length > sessions.length ? " + Ankündigung" : ""}.`
          : `${sessions.length} training session(s)${steps.length > sessions.length ? " + announcement" : ""}.`,
      steps,
    };
  }

  throw new Error(`Unknown intent: ${intent}`);
}

export async function executeProposalStep(
  admin: SupabaseClient,
  clubId: string,
  userId: string,
  step: AgentProposalStep,
): Promise<Record<string, unknown>> {
  const p = step.params;

  if (step.tool === "create_training") {
    const { data, error } = await admin.rpc("agent_create_training", {
      _club_id: clubId,
      _user_id: userId,
      _team_id: p.team_id ?? null,
      _title: String(p.title ?? "Training"),
      _starts_at: String(p.starts_at),
      _ends_at: String(p.ends_at),
      _location: p.location != null ? String(p.location) : null,
    });
    if (error) throw new Error(error.message);
    return (data as Record<string, unknown>) ?? { ok: true };
  }

  if (step.tool === "cancel_training") {
    const { data, error } = await admin.rpc("agent_cancel_training", {
      _club_id: clubId,
      _user_id: userId,
      _activity_id: String(p.activity_id),
      _reason: p.reason != null ? String(p.reason) : null,
    });
    if (error) throw new Error(error.message);
    return (data as Record<string, unknown>) ?? { ok: true };
  }

  if (step.tool === "create_member_draft") {
    const { data, error } = await admin.rpc("agent_create_member_draft", {
      _club_id: clubId,
      _user_id: userId,
      _email: String(p.email),
      _name: p.name != null ? String(p.name) : null,
      _role: p.role != null ? String(p.role) : "member",
      _team: p.team != null ? String(p.team) : null,
      _position: p.position != null ? String(p.position) : null,
    });
    if (error) throw new Error(error.message);
    return (data as Record<string, unknown>) ?? { ok: true };
  }

  if (step.tool === "send_club_announcement") {
    const { data, error } = await admin.rpc("agent_send_club_announcement", {
      _club_id: clubId,
      _user_id: userId,
      _title: String(p.title),
      _content: String(p.content),
      _priority: p.priority != null ? String(p.priority) : "normal",
    });
    if (error) throw new Error(error.message);
    return (data as Record<string, unknown>) ?? { ok: true };
  }

  throw new Error(`Unknown tool: ${step.tool}`);
}

function pushUniqueLink(
  links: { label: string; href: string }[],
  label: string,
  href: string,
) {
  if (!links.some((l) => l.href === href)) {
    links.push({ label, href });
  }
}

export function buildResultLinks(
  intent: AgentIntent,
  language: "en" | "de",
  stepResults?: Record<string, unknown>[],
): { label: string; href: string }[] {
  const de = language === "de";
  const links: { label: string; href: string }[] = [];

  for (const row of stepResults ?? []) {
    const activityId = row.activity_id != null ? String(row.activity_id) : "";
    if (activityId) {
      pushUniqueLink(
        links,
        de ? "Neues Training öffnen" : "Open new training",
        `/teams?highlight=${activityId}`,
      );
    }
    const draftId = row.draft_id != null ? String(row.draft_id) : "";
    if (draftId) {
      pushUniqueLink(links, de ? "Mitgliedsentwurf" : "Member draft", `/members?draft=${draftId}`);
    }
    const announcementId = row.announcement_id != null ? String(row.announcement_id) : "";
    if (announcementId) {
      pushUniqueLink(
        links,
        de ? "Ankündigung öffnen" : "Open announcement",
        `/communication?announcement=${announcementId}`,
      );
    }
  }

  if (
    intent === "create_training" ||
    intent === "cancel_training" ||
    intent === "cancel_training_with_parent_notice" ||
    intent === "plan_training_week" ||
    intent === "duplicate_training_week"
  ) {
    pushUniqueLink(links, de ? "Zum Trainingsplan" : "Open schedule", "/teams");
  }
  if (intent === "add_member_draft") {
    pushUniqueLink(links, de ? "Mitgliederliste" : "Member list", "/members");
  }
  if (
    intent === "send_club_announcement" ||
    intent === "notify_trainers" ||
    intent === "cancel_training_with_parent_notice" ||
    intent === "plan_training_week" ||
    intent === "duplicate_training_week"
  ) {
    pushUniqueLink(links, de ? "Kommunikation" : "Communication", "/communication");
  }
  return links;
}
