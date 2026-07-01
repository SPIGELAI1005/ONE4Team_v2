import { Loader2 } from "lucide-react";
import { ModuleAccessDenied } from "@/components/auth/module-access-denied";
import { usePermissions } from "@/hooks/use-permissions";
import { canAccessPartnersModule } from "@/lib/marketplace-access";
import ClubPartnersWorkflow from "@/pages/club-partners-workflow";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";

/** Club-internal partner CRM — contracts, engagements, directory. */
export default function Partners() {
  const perms = usePermissions();

  const allowed = canAccessPartnersModule(perms.role, perms.assignments);

  if (perms.activeClubLoading || perms.assignmentsLoading) {
    return (
      <div className={DASHBOARD_PAGE_ROOT}>
        <div className={`${DASHBOARD_PAGE_INNER} flex items-center justify-center py-24`}>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <ModuleAccessDenied module="partners" />;
  }

  return <ClubPartnersWorkflow />;
}
