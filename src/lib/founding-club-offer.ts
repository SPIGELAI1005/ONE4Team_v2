import {
  FOUNDING_CLUB_OFFER_CODE,
  isFoundingClubOfferCode,
} from "@/lib/plan-catalog";
import { supabaseDynamic } from "@/lib/supabase-dynamic";

export { FOUNDING_CLUB_OFFER_CODE, isFoundingClubOfferCode };

export interface RedeemOfferResult {
  offerCode: string;
  status: string;
  effectivePlan: string;
  activatedAt: string;
  expiresAt: string;
  graceEndsAt: string;
  memberLimit: number;
  teamLimit: number;
  storageLimitMb: number;
  administratorLimit: number;
}

export async function redeemFoundingClubOffer(clubId: string): Promise<RedeemOfferResult> {
  const { data, error } = await supabaseDynamic.rpc("redeem_commercial_offer", {
    _club_id: clubId,
    _offer_code: FOUNDING_CLUB_OFFER_CODE,
  });
  if (error) throw error;
  const row = data as Record<string, unknown>;
  return {
    offerCode: String(row.offerCode ?? FOUNDING_CLUB_OFFER_CODE),
    status: String(row.status ?? "active"),
    effectivePlan: String(row.effectivePlan ?? "kickoff"),
    activatedAt: String(row.activatedAt ?? ""),
    expiresAt: String(row.expiresAt ?? ""),
    graceEndsAt: String(row.graceEndsAt ?? ""),
    memberLimit: Number(row.memberLimit ?? 500),
    teamLimit: Number(row.teamLimit ?? 10),
    storageLimitMb: Number(row.storageLimitMb ?? 1024),
    administratorLimit: Number(row.administratorLimit ?? 3),
  };
}

export function daysUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - now) / (1000 * 60 * 60 * 24));
}
