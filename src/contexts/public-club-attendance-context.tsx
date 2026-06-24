import { createContext, useContext, type ReactNode } from "react";
import { usePublicClubAttendanceState } from "@/hooks/use-public-club-attendance";

type PublicClubAttendanceContextValue = ReturnType<typeof usePublicClubAttendanceState>;

const PublicClubAttendanceContext = createContext<PublicClubAttendanceContextValue | null>(null);

export function PublicClubAttendanceProvider({ children }: { children: ReactNode }) {
  const value = usePublicClubAttendanceState();
  return <PublicClubAttendanceContext.Provider value={value}>{children}</PublicClubAttendanceContext.Provider>;
}

export function usePublicClubAttendance() {
  const ctx = useContext(PublicClubAttendanceContext);
  if (!ctx) throw new Error("usePublicClubAttendance must be used within PublicClubAttendanceProvider");
  return ctx;
}
