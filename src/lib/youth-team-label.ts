export interface YouthTeamLabel {
  /** Age group number, e.g. 12 for U12. */
  age: number;
  /** Performance tier within the year group: 1 = top, 2 = medium, 3 = weaker. */
  tier: number;
}

const ROMAN_TIER: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
};

function parseTierToken(raw: string): number | null {
  const token = raw.trim();
  if (/^[1-3]$/.test(token)) return Number(token);
  const roman = ROMAN_TIER[token.toLowerCase()];
  return roman ?? null;
}

/** Parse labels like U12-1, U12-I, U12 II into age group + performance tier. */
export function parseYouthTeamLabel(name: string): YouthTeamLabel | null {
  const trimmed = name.trim();
  const match = trimmed.match(/^U\s*(\d{1,2})\s*[-\s]?\s*(1|2|3|I{1,3})$/i);
  if (!match) return null;

  const age = Number(match[1]);
  const tier = parseTierToken(match[2]);
  if (!Number.isFinite(age) || age < 5 || age > 19 || tier == null) return null;

  return { age, tier };
}

export function youthLabelsEquivalent(a: YouthTeamLabel, b: YouthTeamLabel): boolean {
  return a.age === b.age && a.tier === b.tier;
}

export function youthLabelKey(label: YouthTeamLabel): string {
  return `${label.age}:${label.tier}`;
}

export function compareYouthLabels(a: YouthTeamLabel, b: YouthTeamLabel): number {
  if (a.age !== b.age) return a.age - b.age;
  return a.tier - b.tier;
}

/** Find a club team row that matches a youth label (U12-1 ≡ U12-I). */
export function resolveTeamByYouthLabel<T extends { id: string; name: string }>(
  teams: T[],
  label: string | YouthTeamLabel,
): T | null {
  const parsed = typeof label === "string" ? parseYouthTeamLabel(label) : label;
  if (!parsed) return null;

  for (const team of teams) {
    const teamLabel = parseYouthTeamLabel(team.name);
    if (teamLabel && youthLabelsEquivalent(parsed, teamLabel)) return team;
  }

  return null;
}

/** Prefer the canonical club team name when labels are equivalent (e.g. U12-1 → U12-I). */
export function resolveCanonicalYouthTeamName(
  teams: { id: string; name: string }[],
  label: string,
): string {
  return resolveTeamByYouthLabel(teams, label)?.name ?? label;
}
