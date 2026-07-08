import { useQuery } from "@tanstack/react-query";
import { getOperatorPerformanceOverview } from "@/lib/operator-monitoring";

export function useOperatorPerformanceOverview() {
  return useQuery({
    queryKey: ["operator-performance-overview"],
    queryFn: getOperatorPerformanceOverview,
    staleTime: 30_000,
    retry: 1,
  });
}
