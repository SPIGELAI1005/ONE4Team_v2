import {
  compareYouthLabels,
  parseYouthTeamLabel,
  type YouthTeamLabel,
  youthLabelKey,
} from "@/lib/youth-team-label";

export type { YouthTeamLabel } from "@/lib/youth-team-label";
export { parseYouthTeamLabel } from "@/lib/youth-team-label";

/**
 * Teams that typically play in-club friendlies with the selected youth team:
 * same age group (all tiers), one year younger (same tier), one year older (same tier).
 */
export function getFriendlyMatchPeerTeams<T extends { id: string; name: string }>(
  teams: T[],
  selectedTeamId: string,
): T[] {
  const selected = teams.find((team) => team.id === selectedTeamId);
  if (!selected) return [];

  const selectedLabel = parseYouthTeamLabel(selected.name);
  if (!selectedLabel) return [selected];

  const indexed = teams
    .map((team) => ({ team, label: parseYouthTeamLabel(team.name) }))
    .filter((entry): entry is { team: T; label: YouthTeamLabel } => entry.label !== null);

  const byKey = new Map<string, T>();
  for (const entry of indexed) {
    byKey.set(youthLabelKey(entry.label), entry.team);
  }

  const wantedLabels: YouthTeamLabel[] = [
    { age: selectedLabel.age - 1, tier: selectedLabel.tier },
    { age: selectedLabel.age, tier: 1 },
    { age: selectedLabel.age, tier: 2 },
    { age: selectedLabel.age, tier: 3 },
    { age: selectedLabel.age + 1, tier: selectedLabel.tier },
  ];

  const result: T[] = [];
  const seen = new Set<string>();

  for (const label of wantedLabels.sort(compareYouthLabels)) {
    const team = byKey.get(youthLabelKey(label));
    if (!team || seen.has(team.id)) continue;
    seen.add(team.id);
    result.push(team);
  }

  if (!seen.has(selected.id)) {
    result.push(selected);
    result.sort((a, b) => {
      const la = parseYouthTeamLabel(a.name);
      const lb = parseYouthTeamLabel(b.name);
      if (!la || !lb) return a.name.localeCompare(b.name);
      return compareYouthLabels(la, lb);
    });
  }

  return result;
}
