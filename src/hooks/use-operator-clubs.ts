import { useQuery } from "@tanstack/react-query";
import { getOperatorClubs } from "@/lib/operator-club-detail";

export function useOperatorClubs() {
  return useQuery({
    queryKey: ["operator-clubs"],
    queryFn: getOperatorClubs,
    staleTime: 30_000,
    retry: 1,
  });
}
