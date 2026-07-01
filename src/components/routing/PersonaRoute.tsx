import type { ReactNode } from "react";
import { useIsExternalDashboardPersona } from "@/hooks/use-module-gate-role";

interface PersonaRouteProps {
  external: ReactNode;
  internal: ReactNode;
}

/** Renders supplier-scoped UI when the active dashboard persona is external. */
export function PersonaRoute({ external, internal }: PersonaRouteProps) {
  const isExternal = useIsExternalDashboardPersona();
  return isExternal ? external : internal;
}
