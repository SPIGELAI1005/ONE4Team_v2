import { useQuery } from "@tanstack/react-query";
import { getOperatorClubDetail } from "@/lib/operator-club-detail";

export function useOperatorClubDetail(clubId: string | undefined) {
  return useQuery({
    queryKey: ["operator-club-detail", clubId],
    queryFn: () => getOperatorClubDetail(clubId!),
    enabled: Boolean(clubId),
    staleTime: 30_000,
    retry: 1,
  });
}
