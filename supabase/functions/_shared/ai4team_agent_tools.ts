/**
 * AI4Team Agent — intent proposals and RPC execution (Phases 0–3).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AgentIntent =
  | "create_training"
  | "cancel_training"
  | "add_member_draft"
  | "send_club_announcement"
  | "plan_training_week"
  | "notify_trainers";

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

export function parseAgentIntent(raw: unknown): AgentIntent | null {
  const allowed: AgentIntent[] = [
    "create_training",
    "cancel_training",
    "add_member_draft",
    "send_club_announcement",
    "plan_training_week",
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
    const activityId = String(params.activity_id ?? "");
    const reason = params.reason != null ? String(params.reason) : "";
    const titleHint = params.title != null ? String(params.title) : activityId;
    return {
      title: de ? "Training absagen" : "Cancel training",
      summary: de
        ? `Training „${titleHint}“ entfernen.${reason ? ` Grund: ${reason}` : ""}`
        : `Remove training "${titleHint}".${reason ? ` Reason: ${reason}` : ""}`,
      steps: [
        {
          tool: "cancel_training",
          label: de ? "Training aus dem Kalender entfernen" : "Remove training from schedule",
          params: { activity_id: activityId, reason: reason || null },
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

  if (intent === "plan_training_week") {
    const teamId = params.team_id != null ? String(params.team_id) : null;
    const location = params.location != null ? String(params.location) : null;
    const sessions = parseSessions(params.sessions);
    if (sessions.length === 0) {
      throw new Error(de ? "Mindestens eine Trainingseinheit angeben." : "Provide at least one training session.");
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

    return {
      title: de ? "Trainingswoche planen" : "Plan training week",
      summary: de
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

export function buildResultLinks(
  intent: AgentIntent,
  language: "en" | "de",
): { label: string; href: string }[] {
  const de = language === "de";
  const links: { label: string; href: string }[] = [];

  if (
    intent === "create_training" ||
    intent === "cancel_training" ||
    intent === "plan_training_week"
  ) {
    links.push({ label: de ? "Zum Trainingsplan" : "Open schedule", href: "/teams" });
  }
  if (intent === "add_member_draft") {
    links.push({ label: de ? "Mitgliederliste" : "Member list", href: "/members" });
  }
  if (
    intent === "send_club_announcement" ||
    intent === "notify_trainers" ||
    intent === "plan_training_week"
  ) {
    links.push({ label: de ? "Kommunikation" : "Communication", href: "/communication" });
  }
  return links;
}
