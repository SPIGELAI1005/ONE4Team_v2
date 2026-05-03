const SEP = "--";

function slugifySegment(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function encodePublicTeamPathSegment(team: { id: string; name: string }): string {
  const base = slugifySegment(team.name) || "team";
  return `${base}${SEP}${team.id}`;
}

export function decodePublicTeamPathSegment(segment: string | undefined): string | null {
  if (!segment) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
    return segment;
  }
  const i = segment.lastIndexOf(SEP);
  if (i < 0) return null;
  const id = segment.slice(i + SEP.length);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;
  return null;
}
