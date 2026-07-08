import { useQuery } from "@tanstack/react-query";
import { getOperatorMarketplaceOverview } from "@/lib/operator-marketplace";

export function useOperatorMarketplace() {
  return useQuery({
    queryKey: ["operator-marketplace-overview"],
    queryFn: getOperatorMarketplaceOverview,
    staleTime: 30_000,
    retry: 1,
  });
}
