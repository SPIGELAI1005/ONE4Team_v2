export function resolveShareUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).href;
}

export function buildWhatsAppShareUrl(text: string, url?: string): string {
  const payload = url ? `${text}\n${url}` : text;
  return `https://wa.me/?text=${encodeURIComponent(payload)}`;
}

export interface MessageShareLabels {
  /** Includes `{club}` placeholder. */
  header: string;
  /** Used when club name is unavailable. */
  headerFallback: string;
  /** Includes `{name}` placeholder. */
  from: string;
  /** Includes `{team}` placeholder. */
  team: string;
}

export function buildMessageShareText(
  content: string,
  meta?: {
    clubName?: string;
    senderName?: string | null;
    channelLabel?: string;
    labels: MessageShareLabels;
  },
): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (!meta?.labels) return trimmed;

  const header = meta.clubName?.trim()
    ? meta.labels.header.replace("{club}", meta.clubName.trim())
    : meta.labels.headerFallback;

  const lines = [header, "", trimmed, ""];

  if (meta.senderName?.trim()) {
    lines.push(meta.labels.from.replace("{name}", meta.senderName.trim()));
  }
  if (meta.channelLabel?.trim()) {
    lines.push(meta.labels.team.replace("{team}", meta.channelLabel.trim()));
  }

  return lines.join("\n").trimEnd();
}
