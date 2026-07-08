import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackUsageEvent } from "@/lib/usage-events";

export function usePublicClubUsageTracking(clubId: string | null | undefined, isPreviewMode: boolean) {
  const location = useLocation();
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!clubId || isPreviewMode) return;

    const trackingKey = `${clubId}:${location.pathname}`;
    if (trackedKey.current === trackingKey) return;

    trackedKey.current = trackingKey;
    trackUsageEvent({
      eventName: "public_club_page_viewed",
      clubId,
      route: location.pathname,
    });
  }, [clubId, isPreviewMode, location.pathname]);
}
