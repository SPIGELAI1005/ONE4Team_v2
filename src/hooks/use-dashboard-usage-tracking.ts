import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useActiveClub } from "@/hooks/use-active-club";
import { resolveDashboardModuleFromPath, trackUsageEvent } from "@/lib/usage-events";

export function useDashboardUsageTracking() {
  const location = useLocation();
  const { activeClubId } = useActiveClub();
  const trackedDashboardClubId = useRef<string | null>(null);
  const trackedModuleKey = useRef<string | null>(null);

  useEffect(() => {
    if (!activeClubId) return;
    if (trackedDashboardClubId.current === activeClubId) return;

    trackedDashboardClubId.current = activeClubId;
    trackUsageEvent({
      eventName: "club_dashboard_opened",
      clubId: activeClubId,
      route: location.pathname,
    });
  }, [activeClubId, location.pathname]);

  useEffect(() => {
    if (!activeClubId) return;

    const module = resolveDashboardModuleFromPath(location.pathname);
    if (!module) return;

    const trackingKey = `${activeClubId}:${module}:${location.pathname}`;
    if (trackedModuleKey.current === trackingKey) return;

    trackedModuleKey.current = trackingKey;
    trackUsageEvent({
      eventName: "module_opened",
      clubId: activeClubId,
      moduleKey: module,
      route: location.pathname,
    });
  }, [activeClubId, location.pathname]);
}
