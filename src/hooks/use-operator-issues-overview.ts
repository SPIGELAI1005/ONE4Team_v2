import { useQuery } from "@tanstack/react-query";
import { getOperatorIssuesOverview } from "@/lib/operator-monitoring";

export function useOperatorIssuesOverview() {
  return useQuery({
    queryKey: ["operator-issues-overview"],
    queryFn: getOperatorIssuesOverview,
    staleTime: 30_000,
    retry: 1,
  });
}
