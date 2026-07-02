import { supabase } from "@/integrations/supabase/client";

export type ClubInvitePreviewErrorCode =
  | "invalid_token"
  | "not_found"
  | "already_used"
  | "expired"
  | "club_mismatch"
  | "unknown";

export interface ClubInvitePreview {
  clubId: string;
  clubName: string;
  clubSlug: string;
  email: string | null;
  role: string;
  memberName: string | null;
  firstName: string | null;
  lastName: string | null;
  team: string | null;
  ageGroup: string | null;
  position: string | null;
  expiresAt: string | null;
}

interface PreviewClubInviteRow {
  ok: boolean | null;
  error_code: string | null;
  club_id: string | null;
  club_name: string | null;
  club_slug: string | null;
  email: string | null;
  role: string | null;
  member_name: string | null;
  first_name: string | null;
  last_name: string | null;
  team: string | null;
  age_group: string | null;
  member_position: string | null;
  expires_at: string | null;
  used_at: string | null;
}

export function splitInviteMemberName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1).trim() };
}

export function parseClubInvitePreviewRow(row: PreviewClubInviteRow | null | undefined):
  | { ok: true; preview: ClubInvitePreview }
  | { ok: false; errorCode: ClubInvitePreviewErrorCode } {
  if (!row?.ok) {
    const code = row?.error_code?.trim();
    if (
      code === "invalid_token" ||
      code === "not_found" ||
      code === "already_used" ||
      code === "expired" ||
      code === "club_mismatch"
    ) {
      return { ok: false, errorCode: code };
    }
    return { ok: false, errorCode: "unknown" };
  }

  if (!row.club_id || !row.club_name || !row.club_slug || !row.role) {
    return { ok: false, errorCode: "unknown" };
  }

  const firstName = row.first_name?.trim() || null;
  const lastName = row.last_name?.trim() || null;
  const split = splitInviteMemberName(row.member_name);
  const memberName =
    row.member_name?.trim() ||
    [firstName ?? split.firstName, lastName ?? split.lastName].filter(Boolean).join(" ") ||
    null;

  return {
    ok: true,
    preview: {
      clubId: row.club_id,
      clubName: row.club_name,
      clubSlug: row.club_slug,
      email: row.email?.trim().toLowerCase() || null,
      role: row.role,
      memberName,
      firstName: (firstName ?? split.firstName) || null,
      lastName: (lastName ?? split.lastName) || null,
      team: row.team?.trim() || null,
      ageGroup: row.age_group?.trim() || null,
      position: row.member_position?.trim() || null,
      expiresAt: row.expires_at,
    },
  };
}

export async function fetchClubInvitePreview(input: {
  inviteToken: string;
  clubSlug?: string | null;
}): Promise<
  | { ok: true; preview: ClubInvitePreview }
  | { ok: false; errorCode: ClubInvitePreviewErrorCode; message?: string }
> {
  const token = input.inviteToken.trim();
  if (token.length < 10) {
    return { ok: false, errorCode: "invalid_token" };
  }

  const { data, error } = await supabase.rpc("preview_club_invite", {
    _token: token,
    _club_slug: input.clubSlug?.trim() || null,
  });

  if (error) {
    return { ok: false, errorCode: "unknown", message: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as PreviewClubInviteRow | undefined;
  const parsed = parseClubInvitePreviewRow(row);
  if (!parsed.ok) {
    return { ok: false, errorCode: parsed.errorCode };
  }
  return parsed;
}

export function invitePreviewDisplayName(preview: ClubInvitePreview): string {
  return (
    preview.memberName ||
    [preview.firstName, preview.lastName].filter(Boolean).join(" ") ||
    preview.email ||
    ""
  );
}

export const MEMBER_INVITE_MODAL_DISMISSED_KEY = "one4team.memberInviteModalDismissed";

export function memberInviteModalDismissedStorageKey(inviteToken: string): string {
  return `${MEMBER_INVITE_MODAL_DISMISSED_KEY}:${inviteToken.trim()}`;
}
