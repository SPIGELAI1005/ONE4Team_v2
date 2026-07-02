import { supabase } from "@/integrations/supabase/client";
import { notifyMembershipsUpdated } from "@/hooks/use-active-club";

export interface RedeemClubInviteResult {
  role: string;
  clubId: string | null;
}

export async function redeemClubInviteToken(token: string): Promise<RedeemClubInviteResult> {
  const trimmed = token.trim();
  if (trimmed.length < 10) {
    throw new Error("Invalid token");
  }

  const { data, error } = await supabase.rpc("redeem_club_invite", { _token: trimmed });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  notifyMembershipsUpdated();

  return {
    role: (row?.role as string | undefined) || "member",
    clubId: (row?.club_id as string | undefined) || null,
  };
}

export function storeActiveClubMembership(userId: string, clubId: string, role: string): void {
  localStorage.setItem("one4team.activeRole", role);
  localStorage.setItem(`one4team.activeClubId:${userId}`, clubId);
}
