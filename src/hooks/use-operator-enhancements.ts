import { useQuery } from "@tanstack/react-query";
import {
  checkInviteDelivery,
  getMonitoringConnectors,
  getPlatformSettings,
  getSupportClubDiagnostics,
  getSupportUserDiagnostics,
} from "@/lib/operator-enhancements";

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: getPlatformSettings,
    staleTime: 60_000,
  });
}

export function useMonitoringConnectors() {
  return useQuery({
    queryKey: ["operator-monitoring-connectors"],
    queryFn: getMonitoringConnectors,
    staleTime: 60_000,
  });
}

export function useSupportClubDiagnostics(clubId: string | null) {
  return useQuery({
    queryKey: ["operator-support-club", clubId],
    queryFn: () => getSupportClubDiagnostics(clubId!),
    enabled: Boolean(clubId),
    staleTime: 30_000,
  });
}

export function useSupportUserDiagnostics(email: string | null) {
  return useQuery({
    queryKey: ["operator-support-user", email],
    queryFn: () => getSupportUserDiagnostics(email!),
    enabled: Boolean(email?.trim()),
    staleTime: 30_000,
  });
}

export function useInviteDeliveryCheck(email: string | null, clubId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["operator-invite-check", email, clubId],
    queryFn: () => checkInviteDelivery({ email: email!, clubId }),
    enabled: enabled && Boolean(email?.trim()),
    staleTime: 30_000,
  });
}
