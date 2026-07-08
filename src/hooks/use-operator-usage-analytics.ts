import { useQuery } from "@tanstack/react-query";
import {
  getOperatorUsageAnalytics,
  type OperatorUsageAnalyticsFilters,
} from "@/lib/operator-usage-analytics";

export function useOperatorUsageAnalytics(filters: OperatorUsageAnalyticsFilters) {
  return useQuery({
    queryKey: ["operator-usage-analytics", filters],
    queryFn: () => getOperatorUsageAnalytics(filters),
    staleTime: 30_000,
    retry: 1,
  });
}
