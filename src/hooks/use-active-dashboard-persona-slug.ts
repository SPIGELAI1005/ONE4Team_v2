import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ACTIVE_DASHBOARD_PERSONA_KEY,
  DASHBOARD_PERSONA_CHANGED_EVENT,
  readActiveDashboardPersonaSlug,
  type DashboardPersonaChangeDetail,
} from "@/lib/switch-dashboard-persona";
import { normalizeDashboardRole } from "@/lib/rbac-config";

/**
 * Reactive localStorage + URL slug for the active dashboard persona.
 * Re-renders when `switchDashboardPersona` fires or storage changes in another tab.
 */
export function useActiveDashboardPersonaSlug(): string | null {
  const { role: urlRole } = useParams();
  const [storedRevision, setStoredRevision] = useState(0);

  const bump = useCallback(() => setStoredRevision((n) => n + 1), []);

  useEffect(() => {
    function onPersonaChanged() {
      bump();
    }
    function onStorage(event: StorageEvent) {
      if (event.key === ACTIVE_DASHBOARD_PERSONA_KEY || event.key === "one4team_role") {
        bump();
      }
    }

    window.addEventListener(DASHBOARD_PERSONA_CHANGED_EVENT, onPersonaChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DASHBOARD_PERSONA_CHANGED_EVENT, onPersonaChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [bump]);

  void storedRevision;
  const stored = readActiveDashboardPersonaSlug();
  const normalizedStored = stored ? normalizeDashboardRole(stored) : null;
  const normalizedUrl = urlRole ? normalizeDashboardRole(urlRole) : null;
  return normalizedUrl ?? normalizedStored;
}
