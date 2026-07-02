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
}

export interface SendClubWelcomeEmailViaResendInput extends ClubWelcomeEmailContentInput {
  apiKey: string;
  fromEmail: string;
}

const BRAND_GOLD = "#C4952A";
const BRAND_GOLD_DARK = "#8B6914";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absoluteAssetUrl(url: string | null | undefined, siteOrigin: string): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = siteOrigin.replace(/\/+$/, "");
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  return trimmed;
}

export function resolveClubWelcomeLogoUrl(input: {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  siteOrigin: string;
}): string | null {
  return (
    absoluteAssetUrl(input.logoUrl, input.siteOrigin) ||
    absoluteAssetUrl(input.faviconUrl, input.siteOrigin)
  );
}

function renderEmailButton(label: string, href: string, accent: string, accentDark: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="${accent}" style="background-color:${accent};border-radius:10px;mso-padding-alt:14px 36px;">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${accent};border:1px solid ${accentDark};border-radius:10px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:120%;padding:14px 36px;text-align:center;text-decoration:none;letter-spacing:0.3px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function renderClubLogoBlock(clubName: string, logoUrl: string | null, accent: string): string {
  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(clubName)}" width="72" height="72" style="display:block;margin:0 auto 16px auto;width:72px;height:72px;border-radius:9999px;object-fit:cover;border:3px solid ${accent};background:#ffffff;" />`;
  }
  return `<div style="width:72px;height:72px;border-radius:9999px;margin:0 auto 16px auto;background:${accent};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;line-height:72px;text-align:center;">${escapeHtml(clubName.slice(0, 1).toUpperCase())}</div>`;
}

export function buildClubWelcomeEmailContent(input: ClubWelcomeEmailContentInput): {
  subject: string;
  html: string;
} {
  const language = input.language === "de" ? "de" : "en";
  const clubName = input.clubName.trim() || (language === "de" ? "deinem Verein" : "your club");
  const greetingName = input.recipientName?.trim();
  const accent = input.clubPrimaryColor?.trim() || BRAND_GOLD;
  const accentDark = BRAND_GOLD_DARK;
  const logoUrl = input.clubLogoUrl?.trim() || null;

  if (language === "de") {
    const greeting = greetingName ? `Hallo ${escapeHtml(greetingName)},` : "Hallo,";
    return {
      subject: `Willkommen bei ${clubName} auf ONE4Team`,
      html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Willkommen bei ${escapeHtml(clubName)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.06);">
        <tr><td bgcolor="${accent}" style="background-color:${accent};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:34px 32px 0 32px;">
          ${renderClubLogoBlock(clubName, logoUrl, accent)}
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.6px;color:#a1a1aa;text-transform:uppercase;">Willkommen im Team</p>
          <h1 style="margin:0;font-size:24px;font-weight:750;color:#18181b;letter-spacing:-0.4px;">${escapeHtml(clubName)}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;">
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">${greeting}</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">
            Dein Konto ist bereit. Du bist jetzt Teil von <strong>${escapeHtml(clubName)}</strong> auf ONE4Team — entdecke die Vereinsseite, Termine und dein Dashboard.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 12px 32px;">
          ${renderEmailButton("Vereinsseite öffnen", input.clubPageUrl, accent, accentDark)}
        </td></tr>
        <tr><td align="center" style="padding:0 32px 4px 32px;">
          ${renderEmailButton("Zum Dashboard", input.dashboardUrl, accent, accentDark)}
        </td></tr>
        <tr><td style="padding:24px 32px 32px 32px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#a1a1aa;line-height:1.5;">Du kannst dich jederzeit mit <strong>${escapeHtml(input.recipientEmail)}</strong> anmelden.</p>
          <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.5;">ONE4Team · Smart club management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    };
  }

  const greeting = greetingName ? `Hi ${escapeHtml(greetingName)},` : "Hi there,";
  return {
    subject: `Welcome to ${clubName} on ONE4Team`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Welcome to ${escapeHtml(clubName)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.06);">
        <tr><td bgcolor="${accent}" style="background-color:${accent};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:34px 32px 0 32px;">
          ${renderClubLogoBlock(clubName, logoUrl, accent)}
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.6px;color:#a1a1aa;text-transform:uppercase;">Welcome to the team</p>
          <h1 style="margin:0;font-size:24px;font-weight:750;color:#18181b;letter-spacing:-0.4px;">${escapeHtml(clubName)}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;">
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">${greeting}</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">
            Your account is ready. You are now part of <strong>${escapeHtml(clubName)}</strong> on ONE4Team — explore the club page, schedule, and your dashboard.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 12px 32px;">
          ${renderEmailButton("Open club page", input.clubPageUrl, accent, accentDark)}
        </td></tr>
        <tr><td align="center" style="padding:0 32px 4px 32px;">
          ${renderEmailButton("Go to dashboard", input.dashboardUrl, accent, accentDark)}
        </td></tr>
        <tr><td style="padding:24px 32px 32px 32px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#a1a1aa;line-height:1.5;">You can sign in anytime with <strong>${escapeHtml(input.recipientEmail)}</strong>.</p>
          <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.5;">ONE4Team · Smart club management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function sendClubWelcomeEmailViaResend(
  input: SendClubWelcomeEmailViaResendInput,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const { subject, html } = buildClubWelcomeEmailContent(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.fromEmail,
      to: [input.recipientEmail.trim().toLowerCase()],
      subject,
      html,
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
