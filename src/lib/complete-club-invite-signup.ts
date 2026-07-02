import { supabase } from "@/integrations/supabase/client";

export interface CompleteClubInviteSignupInput {
  inviteToken: string;
  clubSlug: string;
  password: string;
  displayName?: string | null;
  language?: "en" | "de";
  siteOrigin?: string;
}

export type CompleteClubInviteSignupResult =
  | { ok: true; email: string; welcomeEmailSent: boolean }
  | {
      ok: false;
      code:
        | "invalid_token"
        | "weak_password"
        | "invite_not_found"
        | "invite_used"
        | "invite_expired"
        | "club_mismatch"
        | "already_registered"
        | "unknown";
      error: string;
    };

function parseResult(data: unknown, fallback: string): CompleteClubInviteSignupResult {
  if (typeof data !== "object" || data === null) {
    return { ok: false, code: "unknown", error: fallback };
  }
  const record = data as Record<string, unknown>;
  if (record.ok === true && typeof record.email === "string") {
    return {
      ok: true,
      email: record.email,
      welcomeEmailSent: record.welcomeEmailSent === true,
    };
  }
  const error = typeof record.error === "string" ? record.error : fallback;
  const code = typeof record.code === "string" ? record.code : "unknown";
  if (
    code === "invalid_token" ||
    code === "weak_password" ||
    code === "invite_not_found" ||
    code === "invite_used" ||
    code === "invite_expired" ||
    code === "club_mismatch" ||
    code === "already_registered"
  ) {
    return { ok: false, code, error };
  }
  return { ok: false, code: "unknown", error };
}

export async function completeClubInviteSignup(
  input: CompleteClubInviteSignupInput,
): Promise<CompleteClubInviteSignupResult> {
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  const { data, error } = await supabase.functions.invoke("complete-club-invite-signup", {
    headers: {
      "Content-Type": "application/json",
      apikey,
    },
    body: {
      inviteToken: input.inviteToken.trim(),
      clubSlug: input.clubSlug.trim(),
      password: input.password,
      displayName: input.displayName?.trim() || undefined,
      language: input.language === "de" ? "de" : "en",
      siteOrigin: input.siteOrigin ?? window.location.origin,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const payload = await context.json();
        return parseResult(payload, error.message);
      } catch {
        // fall through
      }
    }
    return { ok: false, code: "unknown", error: error.message };
  }

  return parseResult(data, "Invite signup could not be completed.");
}
