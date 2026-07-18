import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PublicClubMyProgressSection } from "@/components/public-club/public-club-my-progress-section";
import { EmptyPublicState } from "@/components/public-club/empty-public-state";
import {
  publicClubDetailStackClass,
} from "@/components/public-club/public-club-dashboard-link";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { isHomepageModuleEnabled } from "@/lib/public-page-flex-config";

export default function PublicClubMyProgressPage() {
  const { t } = useLanguage();
  const { club, loading, basePath, searchSuffix } = usePublicClub();
  const homeHref = `${basePath}${searchSuffix}`;

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

  if (!isHomepageModuleEnabled(club.publicPageLayout, "myProgress")) {
    return (
      <EmptyPublicState
        title={t.clubPage.microPageUnavailableTitle}
        description={t.clubPage.microPageUnavailableDesc}
        homeTo={homeHref}
      />
    );
  }

  return (
    <div className="space-y-5 pb-28 sm:pb-12">
      <PublicClubMyProgressSection />
      <div className={`${publicClubDetailStackClass} px-4 sm:px-6`}>
        <Link
          to={homeHref}
          className="inline-flex items-center gap-1.5 text-base font-semibold text-[color:var(--club-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.clubPage.progressBackToHome ?? t.clubPage.reportsBackToHome}
        </Link>
      </div>
    </div>
  );
}
