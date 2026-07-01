import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { marketplacePageExperience } from "@/lib/marketplace-access";
import { ModuleAccessDenied } from "@/components/auth/module-access-denied";
import ClubMarketplacePage from "@/pages/partner/ClubMarketplace";
import { ClubOnlyRoute } from "@/components/routing/PersonaPortalGate";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";

/** Club procurement marketplace only - external personas use `/partner-marketplace`. */
export default function Marketplace() {
  const perms = usePermissions();

  if (perms.activeClubLoading || perms.assignmentsLoading) {
    return (
      <div className={DASHBOARD_PAGE_ROOT}>
        <div className={`${DASHBOARD_PAGE_INNER} flex items-center justify-center py-24`}>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const experience = marketplacePageExperience(perms.role, perms.assignments);

  return (
    <ClubOnlyRoute clubPath="/marketplace">
      {experience === "club_marketplace" ? (
        <ClubMarketplacePage />
      ) : (
        <ModuleAccessDenied module="marketplace" />
      )}
    </ClubOnlyRoute>
  );
}
