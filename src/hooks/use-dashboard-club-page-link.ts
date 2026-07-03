import { useEffect, useMemo, useState } from "react";
import { useActiveClub } from "@/hooks/use-active-club";
import {
  getPublicClubReturnContext,
  resolveDashboardClubPageLink,
  type DashboardClubPageLink,
} from "@/lib/public-club-return";

export function useDashboardClubPageLink(): DashboardClubPageLink | null {
  const { activeClub } = useActiveClub();
  const [returnContext, setReturnContext] = useState(() => getPublicClubReturnContext());

  useEffect(() => {
    setReturnContext(getPublicClubReturnContext());

    function refreshReturnContext() {
      setReturnContext(getPublicClubReturnContext());
    }

    window.addEventListener("focus", refreshReturnContext);
    window.addEventListener("storage", refreshReturnContext);
    return () => {
      window.removeEventListener("focus", refreshReturnContext);
      window.removeEventListener("storage", refreshReturnContext);
    };
  }, []);

  return useMemo(
    () =>
      resolveDashboardClubPageLink({
        activeClubSlug: activeClub?.slug,
        activeClubName: activeClub?.name,
        returnContext,
      }),
    [activeClub?.name, activeClub?.slug, returnContext],
  );
}
