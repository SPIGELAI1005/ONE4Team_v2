import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import {
  readActiveDashboardPersonaRaw,
  useModuleGateRole,
  useResolvedPortalSide,
} from "@/hooks/use-module-gate-role";
import {
  CLUB_MARKETPLACE_ROUTE,
  CLUB_ONLY_PORTAL_PATHS,
  defaultPartnerPortalPath,
  PARTNER_PORTAL_ROUTES,
} from "@/lib/partner-portal-routes";

function PortalGateLoading() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const CLUB_TO_PARTNER: Record<string, string> = {
  [CLUB_MARKETPLACE_ROUTE]: PARTNER_PORTAL_ROUTES.marketplace,
  "/communication": PARTNER_PORTAL_ROUTES.messages,
  "/tasks": PARTNER_PORTAL_ROUTES.tasks,
  "/reports": PARTNER_PORTAL_ROUTES.reports,
  "/co-trainer": PARTNER_PORTAL_ROUTES.ai4t,
  [CLUB_ONLY_PORTAL_PATHS[0]]: PARTNER_PORTAL_ROUTES.supplier_page,
};

const PARTNER_TO_CLUB: Record<string, string> = {
  [PARTNER_PORTAL_ROUTES.marketplace]: CLUB_MARKETPLACE_ROUTE,
  [PARTNER_PORTAL_ROUTES.messages]: "/communication",
  [PARTNER_PORTAL_ROUTES.tasks]: "/tasks",
  [PARTNER_PORTAL_ROUTES.reports]: "/reports",
  [PARTNER_PORTAL_ROUTES.ai4t]: "/co-trainer",
  [PARTNER_PORTAL_ROUTES.supplier_page]: CLUB_ONLY_PORTAL_PATHS[0],
};

/** `/ai` shortcut - club users → co-trainer, partner users → partner-ai. */
export function PersonaAwareAiRedirect() {
  const location = useLocation();
  const portalSide = useResolvedPortalSide(location.pathname);

  if (portalSide === "loading") return <PortalGateLoading />;

  const target =
    portalSide === "partner"
      ? `${PARTNER_PORTAL_ROUTES.ai4t}?tab=agent`
      : "/co-trainer?tab=agent";
  return <Navigate to={target} replace />;
}

interface ClubOnlyRouteProps {
  children: ReactNode;
  clubPath?: string;
}

/** Blocks external personas - sends them to the partner portal equivalent. */
export function ClubOnlyRoute({ children, clubPath }: ClubOnlyRouteProps) {
  const location = useLocation();
  const portalSide = useResolvedPortalSide(location.pathname);
  const gateRole = useModuleGateRole();
  const persona = readActiveDashboardPersonaRaw() ?? "supplier";

  if (portalSide === "loading") return <PortalGateLoading />;

  if (portalSide === "partner") {
    const target =
      (clubPath && CLUB_TO_PARTNER[clubPath]) || defaultPartnerPortalPath(gateRole, persona);
    return <Navigate to={`${target}${location.search}`} replace />;
  }

  return <>{children}</>;
}

interface PartnerOnlyRouteProps {
  children: ReactNode;
  partnerPath: string;
}

/** Blocks club-internal personas - sends them to the club portal equivalent. */
export function PartnerOnlyRoute({ children, partnerPath }: PartnerOnlyRouteProps) {
  const location = useLocation();
  const portalSide = useResolvedPortalSide(location.pathname);

  if (portalSide === "loading") return <PortalGateLoading />;

  if (portalSide === "club") {
    const target = PARTNER_TO_CLUB[partnerPath] ?? CLUB_MARKETPLACE_ROUTE;
    return <Navigate to={`${target}${location.search}`} replace />;
  }

  return <>{children}</>;
}
