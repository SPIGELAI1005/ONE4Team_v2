import { useQuery } from "@tanstack/react-query";
import { getPlatformUsers } from "@/lib/operator-platform-users";

export function usePlatformUsers() {
  return useQuery({
    queryKey: ["platform-users"],
    queryFn: getPlatformUsers,
    staleTime: 30_000,
  });
}
