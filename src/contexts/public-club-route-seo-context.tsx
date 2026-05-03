import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface PublicClubRouteSeoExtras {
  title?: string | null;
  description?: string | null;
  ogImageUrl?: string | null;
  ogType?: "website" | "article";
  /** Merged into `@graph` after the main SportsOrganization node */
  structuredDataNodes?: unknown[] | null;
}

interface PublicClubRouteSeoContextValue {
  extras: PublicClubRouteSeoExtras;
  setExtras: (next: PublicClubRouteSeoExtras | null) => void;
}

const PublicClubRouteSeoContext = createContext<PublicClubRouteSeoContextValue | null>(null);

export function PublicClubRouteSeoProvider({ children }: { children: ReactNode }) {
  const [extras, setExtrasState] = useState<PublicClubRouteSeoExtras>({});
  const setExtras = useCallback((next: PublicClubRouteSeoExtras | null) => {
    setExtrasState(next ?? {});
  }, []);
  const value = useMemo(() => ({ extras, setExtras }), [extras, setExtras]);
  return <PublicClubRouteSeoContext.Provider value={value}>{children}</PublicClubRouteSeoContext.Provider>;
}

export function usePublicClubRouteSeo(): PublicClubRouteSeoContextValue {
  const ctx = useContext(PublicClubRouteSeoContext);
  if (!ctx) throw new Error("usePublicClubRouteSeo must be used within PublicClubRouteSeoProvider");
  return ctx;
}
