import { supabase } from "@/integrations/supabase/client";

export interface GuardianWardSummary {
  linkId: string;
  wardMembershipId: string;
  displayName: string | null;
  role: string;
  teamLabel: string | null;
  status: string;
}

export async function listGuardianWardSummaries(
  clubId: string,
  guardianMembershipId: string,
): Promise<{ data: GuardianWardSummary[]; error: Error | null }> {
  const { data: links, error: linkErr } = await supabase
    .from("club_member_guardian_links")
    .select("id, ward_membership_id")
    .eq("club_id", clubId)
    .eq("guardian_membership_id", guardianMembershipId);

  if (linkErr) return { data: [], error: new Error(linkErr.message) };
  if (!links?.length) return { data: [], error: null };

  const wardIds = links.map((row) => row.ward_membership_id);
  const { data: wards, error: wardErr } = await supabase
    .from("club_memberships")
    .select("id, role, team, age_group, status, profiles:profiles(display_name)")
    .eq("club_id", clubId)
    .in("id", wardIds);

  if (wardErr) return { data: [], error: new Error(wardErr.message) };

  const wardById = new Map(
    (wards ?? []).map((ward) => {
      const profile = ward.profiles as { display_name: string | null } | null;
      const teamLabel = [ward.team, ward.age_group].filter(Boolean).join(" · ") || null;
      return [
        ward.id,
        {
          displayName: profile?.display_name ?? null,
          role: String(ward.role ?? "member"),
          teamLabel,
          status: String(ward.status ?? "active"),
        },
      ] as const;
    }),
  );

  const summaries: GuardianWardSummary[] = links.map((link) => {
    const ward = wardById.get(link.ward_membership_id);
    return {
      linkId: link.id,
      wardMembershipId: link.ward_membership_id,
      displayName: ward?.displayName ?? null,
      role: ward?.role ?? "member",
      teamLabel: ward?.teamLabel ?? null,
      status: ward?.status ?? "unknown",
    };
  });

  return { data: summaries, error: null };
}
