import { useCallback, useEffect, useMemo, useState } from "react";
import { Car, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptTransportRequest,
  createTransportOffer,
  declineTransportRequest,
  listTransportOffers,
  listTransportRequests,
  requestTransportSeat,
} from "@/lib/activity-transport-api";
import {
  canRequestSeat,
  seatsRemaining,
  type ActivityTransportOffer,
  type ActivityTransportRequest,
} from "@/lib/activity-transport";

interface ActivityTransportPanelProps {
  clubId: string;
  activityId: string;
  membershipId: string | null;
  labels: {
    title: string;
    offer: string;
    seats: string;
    meetingPoint: string;
    empty: string;
    request: string;
    remaining: string;
    saved: string;
    failed: string;
    summaryOffered?: string;
    summaryAssigned?: string;
    summaryPending?: string;
    summaryOpen?: string;
    pendingRequests?: string;
    accept?: string;
    decline?: string;
    requestPending?: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

export function ActivityTransportPanel({
  clubId,
  activityId,
  membershipId,
  labels,
  onToast,
}: ActivityTransportPanelProps) {
  const [offers, setOffers] = useState<ActivityTransportOffer[]>([]);
  const [requests, setRequests] = useState<ActivityTransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seats, setSeats] = useState("3");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [offersRes, requestsRes] = await Promise.all([
      listTransportOffers({ clubId, activityId }),
      listTransportRequests({ clubId, activityId }),
    ]);
    if (offersRes.error || requestsRes.error) {
      onToast({
        title: labels.failed,
        description: offersRes.error?.message ?? requestsRes.error?.message,
        variant: "destructive",
      });
      setOffers([]);
      setRequests([]);
    } else {
      setOffers(offersRes.data);
      setRequests(requestsRes.data);
    }
    setLoading(false);
  }, [activityId, clubId, labels.failed, onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!clubId || !activityId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void reload();
      }, 400);
    };

    const channel = supabase
      .channel(`activity-transport-${clubId}-${activityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_transport_offers",
          filter: `club_id=eq.${clubId}`,
        },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_transport_requests",
          filter: `club_id=eq.${clubId}`,
        },
        scheduleReload,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [activityId, clubId, reload]);

  const summary = useMemo(() => {
    const offered = offers.reduce((sum, o) => sum + o.seats_total, 0);
    const assigned = offers.reduce((sum, o) => sum + o.seats_taken, 0);
    const pending = requests.filter((r) => r.status === "pending").length;
    return { offered, assigned, pending, open: Math.max(0, offered - assigned) };
  }, [offers, requests]);

  const pendingForDriver = useMemo(() => {
    if (!membershipId) return [];
    const myOfferIds = new Set(
      offers.filter((o) => o.driver_membership_id === membershipId).map((o) => o.id),
    );
    return requests.filter((r) => myOfferIds.has(r.offer_id) && r.status === "pending");
  }, [membershipId, offers, requests]);

  const myPendingRequestOfferIds = useMemo(() => {
    if (!membershipId) return new Set<string>();
    return new Set(
      requests
        .filter((r) => r.rider_membership_id === membershipId && r.status === "pending")
        .map((r) => r.offer_id),
    );
  }, [membershipId, requests]);

  async function handleOffer() {
    if (!membershipId) return;
    const seatsTotal = Math.min(8, Math.max(1, Number(seats) || 1));
    setBusy(true);
    const { error } = await createTransportOffer({
      clubId,
      activityId,
      driverMembershipId: membershipId,
      seatsTotal,
      meetingPoint,
    });
    setBusy(false);
    if (error) {
      onToast({ title: labels.failed, description: error.message, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    setShowForm(false);
    setMeetingPoint("");
    await reload();
  }

  async function handleRequest(offerId: string) {
    setBusy(true);
    const result = await requestTransportSeat({ offerId });
    setBusy(false);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({
      title: result.status === "pending" ? (labels.requestPending ?? labels.saved) : labels.saved,
    });
    await reload();
  }

  async function handleAccept(requestId: string) {
    setBusy(true);
    const result = await acceptTransportRequest(requestId);
    setBusy(false);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    await reload();
  }

  async function handleDecline(requestId: string) {
    setBusy(true);
    const result = await declineTransportRequest(requestId);
    setBusy(false);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    await reload();
  }

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-background/30 p-3" data-testid="activity-transport-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Car className="h-3.5 w-3.5" />
          {labels.title}
        </div>
        {membershipId ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-2 text-xs"
            data-testid="transport-offer-open"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {labels.offer}
          </Button>
        ) : null}
      </div>

      {offers.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="transport-summary">
          {[
            { label: labels.summaryOffered ?? "Offered", value: summary.offered },
            { label: labels.summaryAssigned ?? "Assigned", value: summary.assigned },
            { label: labels.summaryPending ?? "Pending", value: summary.pending },
            { label: labels.summaryOpen ?? "Open", value: summary.open },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-card/30 px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {pendingForDriver.length > 0 ? (
        <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2" data-testid="transport-pending-driver">
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {labels.pendingRequests ?? "Pending requests"}
          </div>
          <ul className="space-y-1">
            {pendingForDriver.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{req.rider_membership_id.slice(0, 8)}…</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 rounded-lg"
                    disabled={busy}
                    data-testid="transport-accept"
                    onClick={() => void handleAccept(req.id)}
                  >
                    {labels.accept ?? "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg"
                    disabled={busy}
                    data-testid="transport-decline"
                    onClick={() => void handleDecline(req.id)}
                  >
                    {labels.decline ?? "Decline"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showForm ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-[100px_1fr_auto]">
          <Input
            type="number"
            min={1}
            max={8}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            placeholder={labels.seats}
            className="h-9 rounded-xl"
            data-testid="transport-seats-input"
          />
          <Input
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
            placeholder={labels.meetingPoint}
            className="h-9 rounded-xl"
          />
          <Button
            size="sm"
            className="rounded-xl"
            disabled={busy}
            data-testid="transport-offer-submit"
            onClick={() => void handleOffer()}
          >
            {labels.offer}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => {
            const remaining = seatsRemaining(offer);
            const canRequest = canRequestSeat(offer, membershipId) && !myPendingRequestOfferIds.has(offer.id);
            const hasPending = myPendingRequestOfferIds.has(offer.id);
            return (
              <li
                key={offer.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/40 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {labels.remaining.replace("{count}", String(remaining))} · {offer.seats_taken}/{offer.seats_total}
                  </div>
                  {offer.meeting_point ? (
                    <div className="text-muted-foreground">{offer.meeting_point}</div>
                  ) : null}
                  {hasPending ? (
                    <div className="text-amber-700 dark:text-amber-300">{labels.requestPending ?? "Request pending"}</div>
                  ) : null}
                </div>
                {canRequest ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg"
                    disabled={busy}
                    data-testid="transport-request-seat"
                    onClick={() => void handleRequest(offer.id)}
                  >
                    {labels.request}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
