/**
 * ICS calendar helpers for Edge `calendar-ics`.
 * Opaque token is hashed (SHA-256 hex) to match calendar_subscriptions.token_hash.
 */

export async function hashCalendarToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Format ISO datetime as UTC ICS (YYYYMMDDTHHMMSSZ). */
export function toIcsUtc(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export interface IcsActivityRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  type: string | null;
}

export function buildIcsCalendar(input: {
  calendarName: string;
  activities: IcsActivityRow[];
  prodId?: string;
}): string {
  const prodId = input.prodId ?? "-//ONE4Team//EN";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
  ];

  for (const act of input.activities) {
    const dtStart = toIcsUtc(act.starts_at);
    if (!dtStart) continue;
    const endIso =
      act.ends_at && !Number.isNaN(new Date(act.ends_at).getTime())
        ? act.ends_at
        : new Date(new Date(act.starts_at).getTime() + 90 * 60_000).toISOString();
    const dtEnd = toIcsUtc(endIso) ?? dtStart;
    const stamp = toIcsUtc(new Date().toISOString()) ?? dtStart;
    const summary = escapeIcsText(act.title?.trim() || "Activity");
    const loc = act.location?.trim() ? escapeIcsText(act.location.trim()) : null;
    const typeLabel = act.type?.trim() ? escapeIcsText(act.type.trim()) : null;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${act.id}@one4team`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    if (loc) lines.push(`LOCATION:${loc}`);
    if (typeLabel) lines.push(`DESCRIPTION:${typeLabel}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function extractCalendarToken(req: Request): string | null {
  const url = new URL(req.url);
  const q = url.searchParams.get("token")?.trim();
  if (q) return q;

  const path = url.pathname.replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (last && last !== "calendar-ics" && /^[a-f0-9]{64}$/i.test(last)) {
    return last;
  }
  return null;
}
