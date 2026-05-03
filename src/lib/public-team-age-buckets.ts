/** Public club /teams filter buckets (UI only; derived from age_group + team name). */
export type PublicTeamAgeBucketId =
  | "all"
  | "bambini"
  | "u7"
  | "u8"
  | "u9"
  | "u10"
  | "u11"
  | "u12"
  | "u13plus"
  | "seniors"
  | "girls_women";

const U_REGEX = /\bu[_\s]?(\d{1,2})\b/i;

export function inferPublicTeamAgeBucket(ageGroup: string | null | undefined, teamName: string): PublicTeamAgeBucketId {
  const ag = (ageGroup ?? "").trim();
  const nm = (teamName ?? "").trim();
  const combined = `${ag} ${nm}`.toLowerCase();

  if (/(damen|frauen|girls|women|mädchen|womens|ladies)/i.test(combined)) return "girls_women";
  if (/(senior|erwachsene|men|herren|männer|adult)/i.test(combined) && !U_REGEX.test(combined)) return "seniors";
  if (/(bambini|minikicker|förder|foerder|mini)/i.test(combined)) return "bambini";

  const m = combined.match(U_REGEX);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 6) return "bambini";
    if (n === 7) return "u7";
    if (n === 8) return "u8";
    if (n === 9) return "u9";
    if (n === 10) return "u10";
    if (n === 11) return "u11";
    if (n === 12) return "u12";
    if (n >= 13) return "u13plus";
  }

  if (/\bu\s*7\b/i.test(ag) || /\bu7\b/i.test(ag)) return "u7";
  if (/\bu\s*8\b/i.test(ag) || /\bu8\b/i.test(ag)) return "u8";
  if (/\bu\s*9\b/i.test(ag) || /\bu9\b/i.test(ag)) return "u9";
  if (/\bu\s*10\b/i.test(ag) || /\bu10\b/i.test(ag)) return "u10";
  if (/\bu\s*11\b/i.test(ag) || /\bu11\b/i.test(ag)) return "u11";
  if (/\bu\s*12\b/i.test(ag) || /\bu12\b/i.test(ag)) return "u12";
  if (/\bu\s*(1[3-9]|[2-9]\d)\b/i.test(ag)) return "u13plus";

  return "u13plus";
}
