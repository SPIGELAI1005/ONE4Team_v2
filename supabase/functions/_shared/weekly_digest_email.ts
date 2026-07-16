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
  if (locale === "de") {
    lines.push("Offene Beiträge:");
  } else {
    lines.push("Open dues:");
  }

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

  lines.push("", locale === "de" ? "ONE4Team · Smart club management" : "ONE4Team · Smart club management");
  return lines.join("\n");
}

export interface ClubWelcomeEmailContentInput {
  clubName: string;
  clubSlug: string;
  clubPageUrl: string;
  dashboardUrl: string;
  recipientName?: string | null;
  recipientEmail: string;
  clubLogoUrl?: string | null;
  clubPrimaryColor?: string | null;
  language?: "en" | "de";
  digest: MemberWeeklyDigestData;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const BRAND_GOLD = "#C4952A";

function renderList(items: string[]): string {
  if (items.length === 0) return `<p style="margin:0;font-size:14px;color:#71717a;">—</p>`;
  return `<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:#52525b;">${items
    .map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

export function buildWeeklyDigestEmailContent(input: ClubWelcomeEmailContentInput): {
  subject: string;
  html: string;
  text: string;
} {
  const language = input.language === "de" ? "de" : "en";
  const digest = input.digest;
  const scheduleLines = digest.scheduleItems.map(
    (item) => `${formatDigestDateTime(item.startsAt, language)} — ${item.title}`,
  );
  const duesLines = digest.openDues.map((due) => {
    const prefix = due.label ? `${due.label}: ` : "";
    return `${prefix}${formatDigestDate(due.dueDate, language)} — ${formatDigestMoney(due.amountCents, due.currency, language)}`;
  });

  const subject =
    language === "de"
      ? `Deine Wochenübersicht — ${input.clubName}`
      : `Your weekly digest — ${input.clubName}`;

  const greeting =
    language === "de"
      ? digest.recipientName
        ? `Hallo ${escapeHtml(digest.recipientName)},`
        : "Hallo,"
      : digest.recipientName
        ? `Hi ${escapeHtml(digest.recipientName)},`
        : "Hi there,";

  const scheduleTitle = language === "de" ? "Kommende Termine" : "Upcoming schedule";
  const duesTitle = language === "de" ? "Offene Beiträge" : "Open dues";
  const ctaLabel = language === "de" ? "Zum Dashboard" : "Go to dashboard";

  const html = `<!DOCTYPE html>
<html lang="${language}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td bgcolor="${BRAND_GOLD}" style="height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.4px;color:#a1a1aa;text-transform:uppercase;">${language === "de" ? "Wochenübersicht" : "Weekly digest"}</p>
          <h1 style="margin:0 0 16px 0;font-size:22px;color:#18181b;">${escapeHtml(input.clubName)}</h1>
          <p style="margin:0 0 20px 0;font-size:15px;color:#52525b;">${greeting}</p>
          <h2 style="margin:0 0 8px 0;font-size:14px;color:#18181b;">${scheduleTitle}</h2>
          ${renderList(scheduleLines)}
          <h2 style="margin:24px 0 8px 0;font-size:14px;color:#18181b;">${duesTitle}</h2>
          ${renderList(duesLines)}
          <p style="margin:28px 0 0 0;text-align:center;">
            <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:${BRAND_GOLD};color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:10px;">${ctaLabel}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text: buildWeeklyDigestPlainText(digest) };
}

export async function sendWeeklyDigestEmailViaResend(input: {
  apiKey: string;
  fromEmail: string;
  recipientEmail: string;
  content: ReturnType<typeof buildWeeklyDigestEmailContent>;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.fromEmail,
      to: [input.recipientEmail.trim().toLowerCase()],
      subject: input.content.subject,
      html: input.content.html,
      text: input.content.text,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : `Resend API error (${response.status})`;
    return { ok: false, error: message };
  }

  const messageId = typeof payload?.id === "string" ? payload.id : "";
  return { ok: true, messageId };
}
