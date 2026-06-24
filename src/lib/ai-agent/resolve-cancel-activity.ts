import type { AgentProposeResponse } from "@/lib/ai-agent/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function getCancelStepActivityId(proposal: AgentProposeResponse): string | null {
  const step = proposal.proposal?.steps?.find((s) => s.tool === "cancel_training");
  const raw = step?.params?.activity_id;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return isUuid(id) ? id : null;
}

export function cancelProposalIsExecutable(proposal: AgentProposeResponse): boolean {
  return Boolean(getCancelStepActivityId(proposal));
}

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, " ").trim();
}

function sameCalendarDay(iso: string, day: Date, timezone: string): boolean {
  const locale = "en-CA";
  const a = new Date(iso).toLocaleDateString(locale, { timeZone: timezone });
  const b = day.toLocaleDateString(locale, { timeZone: timezone });
  return a === b;
}

export interface UpcomingTrainingRow {
  id: string;
  title: string;
  starts_at: string;
  team_id: string | null;
  team_name: string | null;
}

export function resolveCancelActivityIdFromHints(
  params: Record<string, unknown>,
  upcoming: UpcomingTrainingRow[],
  timezone: string,
): UpcomingTrainingRow | null {
  const existingId = typeof params.activity_id === "string" ? params.activity_id.trim() : "";
  if (existingId && isUuid(existingId)) {
    const hit = upcoming.find((a) => a.id === existingId);
    if (hit) return hit;
  }

  const teamId = typeof params.team_id === "string" ? params.team_id : null;
  const dateHint =
    typeof params.date_hint === "string"
      ? params.date_hint.toLowerCase()
      : typeof params.relative_date === "string"
        ? params.relative_date.toLowerCase()
        : null;

  const now = new Date();
  let dayFilter: ((a: UpcomingTrainingRow) => boolean) | null = null;
  if (dateHint) {
    if (/tomorrow|morgen/.test(dateHint)) {
      const tomorrow = new Date(now.getTime() + 86_400_000);
      dayFilter = (a) => sameCalendarDay(a.starts_at, tomorrow, timezone);
    } else if (/today|heute/.test(dateHint)) {
      dayFilter = (a) => sameCalendarDay(a.starts_at, now, timezone);
    }
  }

  const hint =
    typeof params.activity_hint === "string"
      ? params.activity_hint
      : typeof params.team_name === "string"
        ? params.team_name
        : typeof params.title === "string"
          ? params.title
          : null;

  let candidates = upcoming;
  if (dayFilter) candidates = candidates.filter(dayFilter);
  if (teamId) candidates = candidates.filter((a) => a.team_id === teamId);

  if (hint?.trim()) {
    const lower = normalizeToken(hint);
    const match = candidates.find((a) => {
      const title = normalizeToken(a.title);
      const team = a.team_name ? normalizeToken(a.team_name) : "";
      return title.includes(lower) || lower.includes(title) || (team && (team.includes(lower) || lower.includes(team)));
    });
    return match ?? null;
  }

  if (candidates.length === 1) return candidates[0];

  return null;
}
