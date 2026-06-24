import { supabase } from "@/integrations/supabase/client";
import {
  extractCancelTrainingTarget,
  formatCancelTrainingHeadline,
} from "@/lib/ai-agent/proposal-display";
import {
  cancelProposalIsExecutable,
  getCancelStepActivityId,
  resolveCancelActivityIdFromHints,
  type UpcomingTrainingRow,
} from "@/lib/ai-agent/resolve-cancel-activity";
import type { AgentProposeResponse } from "@/lib/ai-agent/types";
import { getBrowserTimezone } from "@/lib/ai-agent/voice-text";

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function buildCancelSummary(
  headline: string,
  reason: string | null,
  language: "en" | "de",
  withParents: boolean,
): string {
  const de = language === "de";
  if (withParents) {
    return de
      ? `Folgende Einheit wird abgesagt: ${headline}. Eltern erhalten eine Vereinsankündigung.${reason ? ` Grund: ${reason}` : ""}`
      : `The following session will be cancelled: ${headline}. Parents will receive a club announcement.${reason ? ` Reason: ${reason}` : ""}`;
  }
  return de
    ? `Folgende Einheit wird abgesagt: ${headline}.${reason ? ` Grund: ${reason}` : ""}`
    : `The following session will be cancelled: ${headline}.${reason ? ` Reason: ${reason}` : ""}`;
}

async function loadUpcomingTrainings(clubId: string): Promise<UpcomingTrainingRow[]> {
  const now = new Date().toISOString();
  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, title, starts_at, team_id, type")
    .eq("club_id", clubId)
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(40);

  if (error || !activities?.length) return [];

  const teamIds = [...new Set(activities.map((a) => a.team_id).filter(Boolean))] as string[];
  const teamNameById = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase.from("teams").select("id, name").in("id", teamIds);
    for (const team of teams ?? []) {
      teamNameById.set(team.id, team.name);
    }
  }

  return activities
    .filter((a) => !a.type || a.type === "training")
    .map((a) => ({
      id: a.id,
      title: a.title,
      starts_at: a.starts_at,
      team_id: a.team_id,
      team_name: a.team_id ? teamNameById.get(a.team_id) ?? null : null,
    }));
}

function patchCancelStep(
  proposal: AgentProposeResponse,
  cancelIdx: number,
  params: Record<string, unknown>,
  summary: string,
  label: string,
): AgentProposeResponse {
  const body = proposal.proposal;
  const steps = [...(body.steps ?? [])];
  steps[cancelIdx] = { ...steps[cancelIdx], params, label };
  return {
    ...proposal,
    summary,
    proposal: { ...body, summary, steps },
  };
}

export async function enrichAgentProposalDisplay(
  proposal: AgentProposeResponse,
  clubId: string,
  language: "en" | "de",
  timezone = getBrowserTimezone(),
): Promise<AgentProposeResponse> {
  const body = proposal.proposal;
  if (!body?.steps?.length) return proposal;

  const cancelIdx = body.steps.findIndex((step) => step.tool === "cancel_training");
  if (cancelIdx < 0) return proposal;

  const step = body.steps[cancelIdx];
  let params = { ...(step.params ?? {}) };
  const upcoming = await loadUpcomingTrainings(clubId);

  if (!getCancelStepActivityId({ ...proposal, proposal: { ...body, steps: [{ ...step, params }] } })) {
    const resolved = resolveCancelActivityIdFromHints(params, upcoming, timezone);
    if (resolved) {
      params = {
        ...params,
        activity_id: resolved.id,
        activity_title: resolved.title,
        starts_at: resolved.starts_at,
        team_name: resolved.team_name,
        team_id: resolved.team_id,
      };
    }
  }

  const activityId = readString(params.activity_id);
  if (activityId && getCancelStepActivityId({ ...proposal, proposal: { ...body, steps: [{ ...step, params }] } })) {
    const inList = upcoming.find((a) => a.id === activityId);
    if (!inList) {
      const { data: activity } = await supabase
        .from("activities")
        .select("id, title, starts_at, team_id")
        .eq("id", activityId)
        .eq("club_id", clubId)
        .maybeSingle();
      if (activity) {
        let teamName: string | null = null;
        if (activity.team_id) {
          const { data: team } = await supabase.from("teams").select("name").eq("id", activity.team_id).maybeSingle();
          teamName = team?.name ?? null;
        }
        params = {
          ...params,
          activity_title: activity.title,
          starts_at: activity.starts_at,
          team_name: teamName,
        };
      }
    } else {
      params = {
        ...params,
        activity_title: inList.title,
        starts_at: inList.starts_at,
        team_name: inList.team_name,
        team_id: inList.team_id,
      };
    }
  }

  const target = extractCancelTrainingTarget(
    { ...body, steps: [{ ...step, params }] },
    language,
  );
  const headline = target ? formatCancelTrainingHeadline(target, language) : readString(params.activity_title) ?? "Training";
  const reason = readString(params.reason);
  const withParents = body.steps.some((s) => s.tool === "send_club_announcement");
  const summary = buildCancelSummary(headline, reason, language, withParents);
  const label = language === "de" ? `Einheit absagen: ${headline}` : `Cancel session: ${headline}`;

  return patchCancelStep(proposal, cancelIdx, params, summary, label);
}

export function buildProposalUnderstandingMessage(
  proposal: AgentProposeResponse,
  language: "en" | "de",
): string {
  const body = proposal.proposal;
  const cancelTarget = extractCancelTrainingTarget(body, language);
  const de = language === "de";
  const executable = cancelProposalIsExecutable(proposal);

  if (cancelTarget) {
    const headline = formatCancelTrainingHeadline(cancelTarget, language);
    if (!executable) {
      return de
        ? `Ich konnte **${headline}** erkennen, aber keine eindeutige Trainingseinheit im Kalender finden. Bitte Team und Datum genauer nennen (z. B. „U12-1 heute 18:00“) oder wähle die Einheit im Formular **Training absagen**.`
        : `I recognized **${headline}**, but could not find a unique session in the calendar. Please be more specific (e.g. “U12-1 today 6pm”) or pick the session under **Cancel training**.`;
    }
    const base = de
      ? `Verstanden — ich schlage vor, diese Einheit abzusagen:\n\n**${headline}**`
      : `Understood — I propose cancelling this session:\n\n**${headline}**`;
    if (cancelTarget.reason) {
      return de
        ? `${base}\n\nGrund: ${cancelTarget.reason}\n\nBitte prüfe die Details unten und tippe auf **Bestätigen & ausführen**.`
        : `${base}\n\nReason: ${cancelTarget.reason}\n\nPlease review the details below and tap **Confirm & run**.`;
    }
    return de
      ? `${base}\n\nBitte prüfe die Details unten und tippe auf **Bestätigen & ausführen**.`
      : `${base}\n\nPlease review the details below and tap **Confirm & run**.`;
  }

  const summary = proposal.summary?.trim() || body?.summary?.trim();
  if (summary) {
    return de
      ? `Verstanden — ${summary}\n\nBitte prüfe die Schritte unten und bestätige.`
      : `Understood — ${summary}\n\nPlease review the steps below and confirm.`;
  }

  return de
    ? "Ich habe einen Workflow aus deiner Nachricht vorbereitet. Bitte prüfe die Schritte unten."
    : "I've prepared a workflow from your message. Please review the steps below.";
}

export { cancelProposalIsExecutable, getCancelStepActivityId };
