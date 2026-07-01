import { useMemo } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { useModuleGateRole } from "@/hooks/use-module-gate-role";
import { useActiveDashboardPersonaSlug } from "@/hooks/use-active-dashboard-persona-slug";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDashboardRoleLabel, getEffectiveDashboardPersonas } from "@/lib/rbac-config";

/** Shown when the user has multiple personas; team-scoped answers follow Settings persona. */
export function Ai4tPersonaHint() {
  const { t } = useLanguage();
  const gateRole = useModuleGateRole();
  const perms = usePermissions();
  const activePersonaSlug = useActiveDashboardPersonaSlug();

  const personaOptions = useMemo(
    () =>
      getEffectiveDashboardPersonas(perms.role, perms.assignments, {
        treatAsClubAdmin: perms.isAdmin,
      }),
    [perms.role, perms.assignments, perms.isAdmin],
  );

  if (personaOptions.length < 2) return null;

  const roleLabel = formatDashboardRoleLabel(activePersonaSlug || gateRole || perms.role);

  return (
    <Alert className="rounded-2xl border-dashed bg-muted/30">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-xs sm:text-sm">
        {t.coTrainerPage.personaHint.replace("{role}", roleLabel)}
      </AlertDescription>
    </Alert>
  );
}
