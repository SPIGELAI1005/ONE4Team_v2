import { supabase } from "@/integrations/supabase/client";

export type MemberPhotoSource = "registry" | "account";

export interface ResolvedMemberPhoto {
  url: string;
  source: MemberPhotoSource;
  /** True when the account avatar is shown because registry `photo_url` is empty. */
  isAccountFallback: boolean;
}

export function resolveMemberPhotoDisplay(
  registryPhotoUrl: string | null | undefined,
  accountAvatarUrl: string | null | undefined,
): ResolvedMemberPhoto | null {
  const registry = typeof registryPhotoUrl === "string" ? registryPhotoUrl.trim() : "";
  if (registry) {
    return { url: registry, source: "registry", isAccountFallback: false };
  }
  const account = typeof accountAvatarUrl === "string" ? accountAvatarUrl.trim() : "";
  if (account) {
    return { url: account, source: "account", isAccountFallback: true };
  }
  return null;
}

/**
 * Mirror `profiles.avatar_url` into `club_member_master_records.photo_url` for every
 * active membership owned by the signed-in user (direct account only — not guardians/wards).
 */
export async function syncAccountAvatarToOwnMasterPhotos(params: {
  userId: string;
  avatarUrl: string | null;
}): Promise<{ updated: number; error: Error | null }> {
  const { data: memberships, error: membershipError } = await supabase
    .from("club_memberships")
    .select("id, club_id")
    .eq("user_id", params.userId)
    .eq("status", "active");

  if (membershipError) {
    return { updated: 0, error: new Error(membershipError.message) };
  }
  if (!memberships?.length) {
    return { updated: 0, error: null };
  }

  const uploadedAt = params.avatarUrl ? new Date().toISOString() : null;
  let updated = 0;

  for (const row of memberships) {
    const { error } = await supabase.from("club_member_master_records").upsert(
      {
        membership_id: row.id,
        club_id: row.club_id,
        photo_url: params.avatarUrl,
        photo_uploaded_at: uploadedAt,
      },
      { onConflict: "membership_id" },
    );
    if (!error) updated += 1;
  }

  return { updated, error: null };
}

/** Keep account avatar in sync when a member saves their own registry photo on /my-data. */
export async function syncOwnProfileAvatarFromMasterPhoto(params: {
  userId: string;
  photoUrl: string | null;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: params.photoUrl } as Record<string, unknown>)
    .eq("user_id", params.userId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
