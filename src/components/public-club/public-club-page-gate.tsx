import type { ReactNode } from "react";
import type { PublicMicroPageId } from "@/lib/club-page-settings-helpers";
import type { PublicPageSectionId } from "@/lib/club-public-page-sections";
import { isPublicMicroRouteEnabled } from "@/lib/public-page-flex-config";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { EmptyPublicState } from "@/components/public-club/empty-public-state";
import { Loader2 } from "lucide-react";

interface PublicClubPageGateProps {
  /** Section from `public_page_sections` that must be enabled (`join` uses `nextsteps`). */
  section: PublicPageSectionId | "home" | "join";
  children: ReactNode;
}

export function PublicClubPageGate({ section, children }: PublicClubPageGateProps) {
  const { t } = useLanguage();
  const { club, loading, basePath, searchSuffix } = usePublicClub();
  const clubHomeHref = `${basePath}${searchSuffix}`;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
      </div>
    );
  }

  if (!club) {
    return (
      <EmptyPublicState
        title={t.clubPage.clubPageNotAvailable}
        description={t.clubPage.clubPageNotAvailableDesc}
      />
    );
  }

  if (section !== "home") {
    const key: PublicPageSectionId = section === "join" ? "nextsteps" : section;
    if (!club.sectionVisibility[key]) {
      return (
        <EmptyPublicState
          title={t.clubPage.microPageUnavailableTitle}
          description={t.clubPage.microPageUnavailableDesc}
          homeTo={clubHomeHref}
        />
      );
    }
    const navId: PublicMicroPageId = section === "join" ? "join" : (section as PublicMicroPageId);
    if (!isPublicMicroRouteEnabled(club.publicPageLayout, club.sectionVisibility, navId)) {
      return (
        <EmptyPublicState
          title={t.clubPage.microPageUnavailableTitle}
          description={t.clubPage.microPageUnavailableDesc}
          homeTo={clubHomeHref}
        />
      );
    }
  }

  return <>{children}</>;
}
