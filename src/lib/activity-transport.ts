/**
 * Activity-scoped carpool / transport helpers (Wave 4).
 * Meeting points are free-text only — never expose home addresses via schema.
 */

export type TransportOfferStatus = "open" | "full" | "cancelled";
export type TransportRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type ActivityTransportOffer = {
  id: string;
  club_id: string;
  activity_id: string;
  driver_membership_id: string;
  seats_total: number;
  seats_taken: number;
  meeting_point: string | null;
  notes: string | null;
  status: TransportOfferStatus;
};

export type ActivityTransportRequest = {
  id: string;
  club_id: string;
  activity_id: string;
  offer_id: string;
  rider_membership_id: string;
  status: TransportRequestStatus;
  note: string | null;
};

export function seatsRemaining(offer: Pick<ActivityTransportOffer, "seats_total" | "seats_taken" | "status">): number {
  if (offer.status === "cancelled") return 0;
  return Math.max(0, offer.seats_total - offer.seats_taken);
}

export function canRequestSeat(
  offer: Pick<ActivityTransportOffer, "status" | "seats_total" | "seats_taken" | "driver_membership_id">,
  riderMembershipId: string | null,
): boolean {
  if (!riderMembershipId) return false;
  if (offer.driver_membership_id === riderMembershipId) return false;
  if (offer.status !== "open") return false;
  return seatsRemaining(offer) > 0;
}
