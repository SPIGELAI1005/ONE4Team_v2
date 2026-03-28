import { useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { DashboardTopBarContext } from "@/contexts/dashboard-top-bar-context";

export interface DashboardHeaderSlotProps {
  title: string;
  subtitle?: string;
  greeting?: string;
  showBack?: boolean;
  rightSlot?: ReactNode;
  /**
   * Change when toolbar actions depend on state not reflected in title/subtitle
   * (e.g. tab or permission flags), so the top bar re-renders the slot.
   */
  toolbarRevision?: string | number;
}

/**
 * Registers the unified dashboard top bar for the current route.
 */
export function DashboardHeaderSlot({
  title,
  subtitle,
  greeting,
  showBack = true,
  rightSlot,
  toolbarRevision = 0,
}: DashboardHeaderSlotProps) {
  const ctx = useContext(DashboardTopBarContext);
  if (!ctx) {
    throw new Error("DashboardHeaderSlot must be used inside DashboardTopBarProvider");
  }
  const { setConfig } = ctx;
  const slotRef = useRef(rightSlot);
  slotRef.current = rightSlot;

  useLayoutEffect(() => {
    setConfig({
      title,
      subtitle,
      greeting,
      showBack,
      renderRightSlot: () => slotRef.current,
    });
    return () => setConfig(null);
  }, [title, subtitle, greeting, showBack, toolbarRevision, setConfig]);

  return null;
}
