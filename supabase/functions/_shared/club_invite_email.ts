export interface ClubInviteEmailContentInput {
  inviteLink: string;
  clubName: string;
  recipientName?: string | null;
  language?: "en" | "de";
}

export interface SendClubInviteEmailViaResendInput extends ClubInviteEmailContentInput {
  toEmail: string;
  apiKey: string;
  fromEmail: string;
}

export async function hashInviteToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildClubInviteOnboardingUrl(input: {
  inviteToken: string;
  clubSlug?: string | null;
  siteOrigin: string;
}): string {
  const origin = input.siteOrigin.replace(/\/+$/, "");
  const token = input.inviteToken.trim();
  const slug = input.clubSlug?.trim();

  if (slug) {
    const qs = new URLSearchParams({ invite: token });
    return `${origin}/club/${encodeURIComponent(slug)}?${qs.toString()}`;
  }

  const qs = new URLSearchParams({ invite: token });
  return `${origin}/onboarding?${qs.toString()}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Brand gold — solid colors only (gradients are stripped by Gmail/Outlook). */
const INVITE_GOLD = "#C4952A";
const INVITE_GOLD_DARK = "#8B6914";

/**
 * Bulletproof CTA for HTML email clients.
 * Gradients + white link text fail in Gmail (invisible button on white cards).
 */
function renderInviteEmailButton(label: string, inviteLink: string): string {
  const href = escapeHtml(inviteLink);
  const text = escapeHtml(label);
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="${INVITE_GOLD}" style="background-color:${INVITE_GOLD};border-radius:10px;mso-padding-alt:14px 40px;">
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${INVITE_GOLD};border:1px solid ${INVITE_GOLD_DARK};border-radius:10px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:120%;padding:14px 40px;text-align:center;text-decoration:none;letter-spacing:0.3px;">${text}</a>
    </td>
  </tr>
</table>`;
}

function renderInviteEmailAccentBar(): string {
  return `<tr><td bgcolor="${INVITE_GOLD}" style="background-color:${INVITE_GOLD};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

export function buildClubInviteEmailContent(input: ClubInviteEmailContentInput): {
  subject: string;
  html: string;
} {
  const language = input.language === "de" ? "de" : "en";
  const clubName = input.clubName.trim() || (language === "de" ? "deinem Verein" : "your club");
  const greetingName = input.recipientName?.trim();
  const inviteLink = input.inviteLink.trim();

  if (language === "de") {
    const greeting = greetingName ? `Hallo ${escapeHtml(greetingName)},` : "Hallo,";
    return {
      subject: `Einladung zu ${clubName} auf ONE4Team`,
      html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Einladung zu ONE4Team</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.06);">
        ${renderInviteEmailAccentBar()}
        <tr><td align="center" style="padding:34px 32px 0 32px;">
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.6px;color:#a1a1aa;text-transform:uppercase;">Vereinseinladung</p>
          <p style="margin:0;font-size:24px;font-weight:750;color:#18181b;letter-spacing:-0.4px;">ONE<span style="color:#C4952A;">4</span>Team</p>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;">
          <h1 style="margin:0 0 8px 0;font-size:21px;font-weight:700;color:#18181b;text-align:center;">Du bist eingeladen!</h1>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">${greeting}</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">
            <strong>${escapeHtml(clubName)}</strong> hat dich eingeladen, ONE4Team beizutreten. Besuche die Vereinsseite, melde dich an und nimm die Einladung an.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 4px 32px;">
          ${renderInviteEmailButton("Einladung annehmen", inviteLink)}
        </td></tr>
        <tr><td style="padding:20px 32px 0 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
          <p style="margin:6px 0 0 0;font-size:12px;word-break:break-all;"><a href="${escapeHtml(inviteLink)}" style="color:#C4952A;text-decoration:underline;">${escapeHtml(inviteLink)}</a></p>
        </td></tr>
        <tr><td style="padding:28px 32px 32px 32px;text-align:center;">
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
    subject: `You're invited to join ${clubName} on ONE4Team`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>You're invited to ONE4Team</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.06);">
        ${renderInviteEmailAccentBar()}
        <tr><td align="center" style="padding:34px 32px 0 32px;">
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.6px;color:#a1a1aa;text-transform:uppercase;">Club invitation</p>
          <p style="margin:0;font-size:24px;font-weight:750;color:#18181b;letter-spacing:-0.4px;">ONE<span style="color:#C4952A;">4</span>Team</p>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;">
          <h1 style="margin:0 0 8px 0;font-size:21px;font-weight:700;color:#18181b;text-align:center;">You've been invited!</h1>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">${greeting}</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#52525b;text-align:center;">
            <strong>${escapeHtml(clubName)}</strong> invited you to join ONE4Team. Visit the club page, sign in, and accept your invitation.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 4px 32px;">
          ${renderInviteEmailButton("Accept invitation", inviteLink)}
        </td></tr>
        <tr><td style="padding:20px 32px 0 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:6px 0 0 0;font-size:12px;word-break:break-all;"><a href="${escapeHtml(inviteLink)}" style="color:#C4952A;text-decoration:underline;">${escapeHtml(inviteLink)}</a></p>
        </td></tr>
        <tr><td style="padding:28px 32px 32px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.5;">ONE4Team · Smart club management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function sendClubInviteEmailViaResend(
  input: SendClubInviteEmailViaResendInput,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const { subject, html } = buildClubInviteEmailContent(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.fromEmail,
      to: [input.toEmail.trim().toLowerCase()],
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
