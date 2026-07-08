import { useQuery } from "@tanstack/react-query";
import { getOperatorUserDetail } from "@/lib/operator-users";

export function useOperatorUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ["operator-user-detail", userId],
    queryFn: () => getOperatorUserDetail(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });
}
