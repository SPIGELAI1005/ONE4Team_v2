/* eslint-disable react-refresh/only-export-components -- context + provider colocated intentionally */
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export interface DashboardTopBarConfig {
  title: string;
  subtitle?: string;
  /** When set, shown as the secondary line instead of club · subtitle. */
  greeting?: string;
  showBack?: boolean;
  /** Lazy so the layout bar can re-read latest tree when `toolbarRevision` bumps. */
  renderRightSlot?: () => ReactNode;
}

interface DashboardTopBarContextValue {
  config: DashboardTopBarConfig | null;
  setConfig: (config: DashboardTopBarConfig | null) => void;
}

export const DashboardTopBarContext = createContext<DashboardTopBarContextValue | null>(null);

export function DashboardTopBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<DashboardTopBarConfig | null>(null);

  const setConfig = useCallback((next: DashboardTopBarConfig | null) => {
    setConfigState(next);
  }, []);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);

  return (
    <DashboardTopBarContext.Provider value={value}>{children}</DashboardTopBarContext.Provider>
  );
}
