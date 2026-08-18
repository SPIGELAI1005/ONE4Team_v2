/**
 * Attendance reminder emails (Wave 2 follow-up — in-app + email).
 */
export interface AttendanceReminderEmailInput {
  toEmail: string;
  recipientName?: string | null;
  clubName: string;
  activityTitle: string;
  startsAtLabel: string;
  language?: "en" | "de";
}

export function buildAttendanceReminderEmailContent(input: AttendanceReminderEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const de = input.language === "de";
  const name = input.recipientName?.trim();
  const greeting = de
    ? name
      ? `Hallo ${name},`
      : "Hallo,"
    : name
      ? `Hi ${name},`
      : "Hi,";
  const subject = de
    ? `RSVP-Erinnerung: ${input.activityTitle}`
    : `RSVP reminder: ${input.activityTitle}`;
  const body = de
    ? `${greeting}\n\nBitte für „${input.activityTitle}“ (${input.startsAtLabel}) zusagen oder absagen.\n\n${input.clubName}`
    : `${greeting}\n\nPlease RSVP for "${input.activityTitle}" (${input.startsAtLabel}).\n\n${input.clubName}`;
  const html = `<p>${greeting}</p><p>${
    de
      ? `Bitte für <strong>${escapeHtml(input.activityTitle)}</strong> (${escapeHtml(input.startsAtLabel)}) zusagen oder absagen.`
      : `Please RSVP for <strong>${escapeHtml(input.activityTitle)}</strong> (${escapeHtml(input.startsAtLabel)}).`
  }</p><p>${escapeHtml(input.clubName)}</p>`;
  return { subject, html, text: body };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAttendanceReminderEmailViaResend(input: {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  content: { subject: string; html: string; text: string };
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.fromEmail,
        to: [input.toEmail],
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `resend_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
