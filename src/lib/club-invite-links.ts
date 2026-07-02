/**
 * URLs for admin-created member invites (email + copy link in Members).
 * Landing on the public club page lets invitees explore the club before signing in.
 */

export interface ClubInviteLinkInput {
  inviteToken: string;
  clubSlug?: string | null;
  siteOrigin: string;
}

function normalizeOrigin(siteOrigin: string): string {
  return siteOrigin.replace(/\/+$/, "");
}

/** Public club home with invite token (primary entry from email). */
export function buildClubInviteLandingUrl(input: ClubInviteLinkInput): string {
  const origin = normalizeOrigin(input.siteOrigin);
  const token = input.inviteToken.trim();
  const slug = input.clubSlug?.trim();

  if (slug) {
    const qs = new URLSearchParams({ invite: token });
    return `${origin}/club/${encodeURIComponent(slug)}?${qs.toString()}`;
  }

  const qs = new URLSearchParams({ invite: token });
  return `${origin}/onboarding?${qs.toString()}`;
}

/** Signed-in redeem step (after auth from the club page). */
export function buildClubInviteRedeemUrl(input: ClubInviteLinkInput): string {
  const origin = normalizeOrigin(input.siteOrigin);
  const qs = new URLSearchParams({ invite: input.inviteToken.trim() });
  const slug = input.clubSlug?.trim();
  if (slug) qs.set("club", slug);
  return `${origin}/onboarding?${qs.toString()}`;
}
