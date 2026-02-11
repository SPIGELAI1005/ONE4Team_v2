import { useActiveClub } from "@/hooks/use-active-club";

export function useClubId() {
  const { activeClubId, loading } = useActiveClub();
  return { clubId: activeClubId, loading };
}
