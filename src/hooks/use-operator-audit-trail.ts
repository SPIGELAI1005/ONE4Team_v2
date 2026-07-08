import { useQuery } from "@tanstack/react-query";
import { getOperatorAuditTrail, type OperatorAuditTrailFilters } from "@/lib/platform-audit";

export function useOperatorAuditTrail(filters: OperatorAuditTrailFilters) {
  return useQuery({
    queryKey: ["operator-audit-trail", filters],
    queryFn: () => getOperatorAuditTrail(filters),
    staleTime: 15_000,
    retry: 1,
  });
}
