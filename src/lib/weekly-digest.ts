export interface DigestScheduleItem {
  title: string;
  startsAt: string;
  type: string;
}

export interface DigestDueItem {
  id: string;
  dueDate: string;
  amountCents: number | null;
  currency: string;
  status: string;
  label?: string;
}

export interface MemberWeeklyDigestData {
  clubName: string;
  recipientName: string | null;
  scheduleItems: DigestScheduleItem[];
  openDues: DigestDueItem[];
  language: "en" | "de";
}

export function formatDigestMoney(amountCents: number | null, currency: string, locale: "en" | "de"): string {
  if (amountCents == null) return locale === "de" ? "Betrag offen" : "Amount TBD";
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amountCents / 100);
}

export function formatDigestDate(isoDate: string, locale: "en" | "de"): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDigestDateTime(iso: string, locale: "en" | "de"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildWeeklyDigestPlainText(data: MemberWeeklyDigestData): string {
  const locale = data.language;
  const lines: string[] = [];

  if (locale === "de") {
    lines.push(`Wochenübersicht — ${data.clubName}`, "");
    if (data.recipientName) lines.push(`Hallo ${data.recipientName},`, "");
    lines.push("Kommende Termine (7 Tage):");
  } else {
    lines.push(`Weekly digest — ${data.clubName}`, "");
    if (data.recipientName) lines.push(`Hi ${data.recipientName},`, "");
    lines.push("Upcoming (next 7 days):");
  }

  if (data.scheduleItems.length === 0) {
    lines.push(locale === "de" ? "  (keine Termine)" : "  (none scheduled)");
  } else {
    for (const item of data.scheduleItems) {
      lines.push(`  • ${formatDigestDateTime(item.startsAt, locale)} — ${item.title} (${item.type})`);
    }
  }

  lines.push("");
  lines.push(locale === "de" ? "Offene Beiträge:" : "Open dues:");

  if (data.openDues.length === 0) {
    lines.push(locale === "de" ? "  (keine offenen Beiträge)" : "  (no open dues)");
  } else {
    for (const due of data.openDues) {
      const label = due.label ? `${due.label} — ` : "";
      lines.push(
        `  • ${label}${formatDigestDate(due.dueDate, locale)} — ${formatDigestMoney(due.amountCents, due.currency, locale)}`,
      );
    }
  }

  lines.push("", "ONE4Team · Smart club management");
  return lines.join("\n");
}
