import { useQuery } from "@tanstack/react-query";
import { getOperatorUsers, type OperatorUsersFilters } from "@/lib/operator-users";

export function useOperatorUsers(filters: OperatorUsersFilters) {
  return useQuery({
    queryKey: ["operator-users", filters],
    queryFn: () => getOperatorUsers(filters),
    staleTime: 30_000,
    retry: 1,
  });
}
