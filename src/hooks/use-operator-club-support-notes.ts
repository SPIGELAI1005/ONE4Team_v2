import { useQuery } from "@tanstack/react-query";
import { getOperatorClubSupportNotes } from "@/lib/operator-support-notes";

export function useOperatorClubSupportNotes(
  clubId: string | undefined,
  filters: { category?: string | null; includeArchived?: boolean },
) {
  return useQuery({
    queryKey: ["operator-club-support-notes", clubId, filters],
    queryFn: () =>
      getOperatorClubSupportNotes({
        clubId: clubId as string,
        category: filters.category,
        includeArchived: filters.includeArchived,
      }),
    enabled: Boolean(clubId),
    staleTime: 15_000,
    retry: 1,
  });
}
