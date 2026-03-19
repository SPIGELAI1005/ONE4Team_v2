export interface SportDefinition {
  id: string;
  label: string;
  defaultStats: string[];
}

export const SPORTS_CATALOG: SportDefinition[] = [
  { id: "football", label: "Football", defaultStats: ["goals", "assists", "minutes_played", "clean_sheets", "saves"] },
  { id: "basketball", label: "Basketball", defaultStats: ["points", "rebounds", "assists", "steals", "blocks"] },
  { id: "handball", label: "Handball", defaultStats: ["goals", "assists", "blocks", "saves"] },
  { id: "volleyball", label: "Volleyball", defaultStats: ["points", "blocks", "aces", "digs"] },
];

export function resolveSportLabel(idOrLabel: string): string {
  const normalized = idOrLabel.trim().toLowerCase();
  const hit = SPORTS_CATALOG.find((sport) => sport.id === normalized || sport.label.toLowerCase() === normalized);
  return hit?.label || idOrLabel;
}

export function resolveSportId(idOrLabel: string): string {
  const normalized = idOrLabel.trim().toLowerCase();
  const hit = SPORTS_CATALOG.find((sport) => sport.id === normalized || sport.label.toLowerCase() === normalized);
  return hit?.id || "football";
}
