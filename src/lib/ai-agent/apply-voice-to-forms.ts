import type { AgentIntent, PlanWeekSessionInput } from "./types";

export interface AgentFormStatePatch {
  intent: AgentIntent;
}

export interface CreateTrainingFormPatch extends AgentFormStatePatch {
  intent: "create_training";
  teamId: string;
  title: string;
  startLocal: string;
  endLocal: string;
  location: string;
}

export interface CancelTrainingFormPatch extends AgentFormStatePatch {
  intent: "cancel_training" | "cancel_training_with_parent_notice";
  activityId: string;
  reason: string;
}

export interface MemberDraftFormPatch extends AgentFormStatePatch {
  intent: "add_member_draft";
  email: string;
  name: string;
  role: string;
  team: string;
  position: string;
}

export interface NotifyFormPatch extends AgentFormStatePatch {
  intent: "notify_trainers";
  title: string;
  content: string;
}

export interface PlanWeekFormPatch extends AgentFormStatePatch {
  intent: "plan_training_week";
  teamId: string;
  location: string;
  sessions: PlanWeekSessionInput[];
  notify: boolean;
  notifyTitle: string;
  notifyContent: string;
}

export interface DuplicateWeekFormPatch extends AgentFormStatePatch {
  intent: "duplicate_training_week";
  teamId: string;
}

export type VoiceFormPatch =
  | CreateTrainingFormPatch
  | CancelTrainingFormPatch
  | MemberDraftFormPatch
  | NotifyFormPatch
  | PlanWeekFormPatch
  | DuplicateWeekFormPatch;

function isoToLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Map interpreted workflow params → Agent tab form fields. */
export function buildFormPatchFromParams(
  intent: AgentIntent,
  params: Record<string, unknown>,
): VoiceFormPatch | null {
  if (intent === "send_club_announcement") {
    return {
      intent: "notify_trainers",
      title: typeof params.title === "string" ? params.title : "",
      content: typeof params.content === "string" ? params.content : "",
    };
  }

  if (intent === "create_training") {
    const starts = typeof params.starts_at === "string" ? params.starts_at : "";
    const ends = typeof params.ends_at === "string" ? params.ends_at : "";
    return {
      intent: "create_training",
      teamId: typeof params.team_id === "string" ? params.team_id : "",
      title: typeof params.title === "string" ? params.title : "Training",
      startLocal: isoToLocalDatetimeInput(starts),
      endLocal: isoToLocalDatetimeInput(ends),
      location: params.location != null ? String(params.location) : "",
    };
  }

  if (intent === "cancel_training" || intent === "cancel_training_with_parent_notice") {
    return {
      intent: intent === "cancel_training_with_parent_notice" ? "cancel_training_with_parent_notice" : "cancel_training",
      activityId: typeof params.activity_id === "string" ? params.activity_id : "",
      reason: params.reason != null ? String(params.reason) : "",
    };
  }

  if (intent === "add_member_draft") {
    return {
      intent: "add_member_draft",
      email: typeof params.email === "string" ? params.email : "",
      name: params.name != null ? String(params.name) : "",
      role: typeof params.role === "string" ? params.role : "member",
      team: params.team != null ? String(params.team) : "",
      position: params.position != null ? String(params.position) : "",
    };
  }

  if (intent === "notify_trainers") {
    return {
      intent: "notify_trainers",
      title: typeof params.title === "string" ? params.title : "",
      content: typeof params.content === "string" ? params.content : "",
    };
  }

  if (intent === "plan_training_week") {
    const rawSessions = Array.isArray(params.sessions) ? params.sessions : [];
    const sessions: PlanWeekSessionInput[] = rawSessions
      .filter((s) => s && typeof s === "object")
      .map((s) => {
        const row = s as Record<string, unknown>;
        const starts = typeof row.starts_at === "string" ? row.starts_at : "";
        const ends = typeof row.ends_at === "string" ? row.ends_at : "";
        return {
          title: typeof row.title === "string" ? row.title : "Training",
          starts_at: isoToLocalDatetimeInput(starts),
          ends_at: isoToLocalDatetimeInput(ends),
          location: row.location != null ? String(row.location) : null,
        };
      })
      .filter((s) => s.starts_at && s.ends_at);

    if (sessions.length === 0) return null;

    const ann = params.announcement as Record<string, unknown> | undefined;
    const hasAnn = Boolean(ann && typeof ann.title === "string" && typeof ann.content === "string");

    return {
      intent: "plan_training_week",
      teamId: typeof params.team_id === "string" ? params.team_id : "",
      location: params.location != null ? String(params.location) : "",
      sessions,
      notify: hasAnn,
      notifyTitle: hasAnn ? String(ann!.title) : "",
      notifyContent: hasAnn ? String(ann!.content) : "",
    };
  }

  if (intent === "duplicate_training_week") {
    return {
      intent: "duplicate_training_week",
      teamId: typeof params.team_id === "string" ? params.team_id : "",
    };
  }

  return null;
}
