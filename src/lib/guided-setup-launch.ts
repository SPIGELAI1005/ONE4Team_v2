import { supabase } from "@/integrations/supabase/client";
import {
  clubRowToPublicPageConfig,
  getClubPageDraftConfig,
  publishClubPageConfig,
  saveClubPageDraftConfig,
} from "@/lib/club-public-page-config";
import { parseRegistrySpreadsheetFirstSheet } from "@/lib/member-master-xlsx";
import { sendClubInviteEmail } from "@/lib/send-club-invite-email";
import { trackUsageEvent } from "@/lib/usage-events";
import { generateInviteToken, hashInviteToken } from "@/features/members/invite-crypto";

export const GUIDED_IMPORT_MAX = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function parseInviteEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export interface GuidedImportPreviewRow {
  name: string;
  email: string;
}

export async function previewGuidedMemberImport(file: File): Promise<{
  rows: GuidedImportPreviewRow[];
  truncated: boolean;
  totalParsed: number;
}> {
  const parsed = await parseRegistrySpreadsheetFirstSheet(file);
  const rows: GuidedImportPreviewRow[] = [];
  const seen = new Set<string>();
  for (const row of parsed) {
    const email = normalizeEmail(row.email || "");
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    const name =
      [row.raw.first_name, row.raw.last_name].filter(Boolean).join(" ") ||
      row.raw.name ||
      row.raw.full_name ||
      [row.raw.vorname, row.raw.nachname].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "Member";
    rows.push({ name: String(name).trim(), email });
    if (rows.length >= GUIDED_IMPORT_MAX) break;
  }
  return {
    rows,
    truncated: parsed.filter((r) => EMAIL_RE.test(normalizeEmail(r.email || ""))).length > GUIDED_IMPORT_MAX,
    totalParsed: parsed.length,
  };
}

export async function commitGuidedMemberImport(params: {
  clubId: string;
  rows: GuidedImportPreviewRow[];
}): Promise<{ saved: number; skipped: number }> {
  const limited = params.rows.slice(0, GUIDED_IMPORT_MAX);
  let saved = 0;
  let skipped = 0;
  for (const row of limited) {
    const email = normalizeEmail(row.email);
    if (!email || !EMAIL_RE.test(email)) {
      skipped += 1;
      continue;
    }
    const { error } = await supabase.from("club_member_drafts").insert({
      club_id: params.clubId,
      name: row.name.trim() || null,
      email,
      role: "member",
      team: null,
      age_group: null,
      position: null,
      master_data: {},
    } as Record<string, unknown>);
    if (error) {
      skipped += 1;
      continue;
    }
    saved += 1;
  }
  if (saved > 0) {
    trackUsageEvent({
      eventName: "guided_import_completed",
      clubId: params.clubId,
      moduleKey: "members",
      metadata: { saved, skipped, source: "guided_setup" },
    });
  }
  return { saved, skipped };
}

export async function ensureSharedInviteLink(clubId: string): Promise<{ token: string } | { error: string }> {
  const { data, error } = await supabase.rpc("create_club_invite", {
    _club_id: clubId,
    _max_uses: 50,
    _expires_in_days: 14,
    _payload: { source: "guided_setup" },
  });
  if (error) return { error: error.message };
  const token = typeof data === "string" ? data : (data as { token?: string })?.token ?? String(data);
  return { token };
}

export async function sendGuidedInviteEmails(params: {
  clubId: string;
  emails: string[];
  language: "en" | "de";
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const emails = params.emails.slice(0, GUIDED_IMPORT_MAX);

  for (const email of emails) {
    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);
    const { data, error } = await supabase
      .from("club_invites")
      .insert({
        club_id: params.clubId,
        email,
        role: "member",
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        invite_payload: { source: "guided_setup" },
      })
      .select("id")
      .single();
    if (error || !data?.id) {
      failed += 1;
      errors.push(error?.message || email);
      continue;
    }
    const result = await sendClubInviteEmail({
      clubId: params.clubId,
      inviteId: data.id,
      toEmail: email,
      inviteToken: token,
      language: params.language,
      siteOrigin: window.location.origin,
    });
    if (result.ok) sent += 1;
    else {
      failed += 1;
      errors.push(result.error);
    }
  }

  if (sent > 0 || failed > 0) {
    trackUsageEvent({
      eventName: "guided_invites_sent",
      clubId: params.clubId,
      moduleKey: "invites",
      metadata: { sent, failed, source: "guided_setup" },
    });
  }
  return { sent, failed, errors };
}

export async function publishGuidedClubPage(params: {
  clubId: string;
  userId: string | null;
  description: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const description = params.description.trim();
  if (description) {
    const { error } = await supabase
      .from("clubs")
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", params.clubId);
    if (error) return { ok: false, error: error.message };
  }

  const { data: existingDraft } = await getClubPageDraftConfig(supabase, params.clubId);
  const { data: clubRow } = await supabase.from("clubs").select("*").eq("id", params.clubId).maybeSingle();
  const base =
    existingDraft ||
    (clubRow ? clubRowToPublicPageConfig(clubRow as Record<string, unknown>) : null);
  if (!base) return { ok: false, error: "club_not_found" };

  const next = {
    ...base,
    general: {
      ...base.general,
      description: description || base.general.description || null,
    },
  };

  const { error: draftError } = await saveClubPageDraftConfig(
    supabase,
    params.clubId,
    next,
    params.userId,
  );
  if (draftError) return { ok: false, error: draftError.message };

  const { error: publishError } = await publishClubPageConfig(supabase, params.clubId);
  if (publishError) return { ok: false, error: publishError.message };

  trackUsageEvent({
    eventName: "guided_page_published",
    clubId: params.clubId,
    moduleKey: "club_page",
    metadata: { source: "guided_setup" },
  });
  return { ok: true };
}
