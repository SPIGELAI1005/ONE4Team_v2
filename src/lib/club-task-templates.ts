/**
 * Wave 3 — duty templates: starter catalog + spawn helpers.
 */

import type { ClubTaskPriority } from "@/lib/club-task-models";

export type ClubTaskTemplateRow = {
  id: string;
  club_id: string;
  key: string;
  name: string;
  title_template: string;
  description_template: string | null;
  priority: ClubTaskPriority;
  claimable: boolean;
  checklist_titles: unknown;
};

export type StarterTaskTemplate = {
  key: string;
  name: string;
  title_template: string;
  description_template: string;
  priority: ClubTaskPriority;
  claimable: boolean;
  checklist_titles: string[];
  default_slots_total: number | null;
};

/** Built-in presets seeded into `club_task_templates` when a club has none. */
export const STARTER_TASK_TEMPLATES: StarterTaskTemplate[] = [
  {
    key: "matchday_setup",
    name: "Matchday setup",
    title_template: "Matchday setup",
    description_template: "Prepare pitch, goals, and benches before kickoff.",
    priority: "high",
    claimable: true,
    checklist_titles: ["Goals & nets", "Corner flags", "Benches / benches tidy", "Water / ice"],
    default_slots_total: 2,
  },
  {
    key: "carpool_duty",
    name: "Carpool duty",
    title_template: "Carpool coordinator",
    description_template: "Coordinate drivers and seats for the next session.",
    priority: "normal",
    claimable: true,
    checklist_titles: ["Confirm drivers", "Share meeting point", "Headcount vs seats"],
    default_slots_total: 1,
  },
  {
    key: "kit_wash",
    name: "Kit wash",
    title_template: "Kit wash",
    description_template: "Collect and return washed match/training kit.",
    priority: "normal",
    claimable: true,
    checklist_titles: ["Collect kit", "Wash & dry", "Return to kit bag"],
    default_slots_total: 1,
  },
  {
    key: "first_aid_bag",
    name: "First-aid bag",
    title_template: "First-aid bag check",
    description_template: "Verify first-aid kit contents before the session.",
    priority: "high",
    claimable: true,
    checklist_titles: ["Ice packs", "Bandages / tape", "Gloves", "Emergency contacts card"],
    default_slots_total: 1,
  },
];

export function parseChecklistTitles(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseChecklistTitles(parsed);
    } catch {
      return raw
        .split(/[\n,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function starterSlotsForKey(key: string): number | null {
  return STARTER_TASK_TEMPLATES.find((t) => t.key === key)?.default_slots_total ?? null;
}
