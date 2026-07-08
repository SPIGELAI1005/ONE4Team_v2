import { useQuery } from "@tanstack/react-query";
import { getOperatorPlatformOverview } from "@/lib/platform-overview";

export function useOperatorOverview() {
  return useQuery({
    queryKey: ["operator-platform-overview"],
    queryFn: getOperatorPlatformOverview,
    staleTime: 30_000,
    retry: 1,
  });
}
