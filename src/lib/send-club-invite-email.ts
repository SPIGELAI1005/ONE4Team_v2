import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionAuthHeaders } from "@/lib/edge-function-auth";

export interface SendClubInviteEmailInput {
  clubId: string;
  inviteId: string;
  toEmail: string;
  inviteToken: string;
  recipientName?: string | null;
  language?: "en" | "de";
  siteOrigin?: string;
}

export type SendClubInviteEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; code?: "email_not_configured" | "email_send_failed" | "unauthorized" | "unknown"; error: string };

function parseFunctionError(data: unknown, fallback: string): SendClubInviteEmailResult {
  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    const error = typeof record.error === "string" ? record.error : fallback;
    const code =
      record.code === "email_not_configured" ||
      record.code === "email_send_failed" ||
      record.code === "unauthorized"
        ? record.code
        : "unknown";
    return { ok: false, error, code };
  }
  return { ok: false, error: fallback, code: "unknown" };
}

function mapInvokeTransportError(message: string): SendClubInviteEmailResult {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("failed to send a request to the edge function") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror")
  ) {
    return {
      ok: false,
      code: "unknown",
      error: `edge_unreachable:${window.location.origin}`,
    };
  }
  return { ok: false, error: message, code: "unknown" };
}

export async function sendClubInviteEmail(
  input: SendClubInviteEmailInput,
): Promise<SendClubInviteEmailResult> {
  const headers = await getEdgeFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke("send-club-invite-email", {
    headers,
    body: {
      clubId: input.clubId,
      inviteId: input.inviteId,
      toEmail: input.toEmail.trim().toLowerCase(),
      inviteToken: input.inviteToken,
      recipientName: input.recipientName?.trim() || undefined,
      language: input.language === "de" ? "de" : "en",
      siteOrigin: input.siteOrigin ?? window.location.origin,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const payload = await context.json();
        return parseFunctionError(payload, error.message);
      } catch {
        // fall through
      }
    }
    return mapInvokeTransportError(error.message);
  }

  if (typeof data === "object" && data !== null && (data as { ok?: boolean }).ok) {
    const messageId =
      typeof (data as { messageId?: unknown }).messageId === "string"
        ? (data as { messageId: string }).messageId
        : undefined;
    return { ok: true, messageId };
  }

  return parseFunctionError(data, "Invite email could not be sent.");
}
