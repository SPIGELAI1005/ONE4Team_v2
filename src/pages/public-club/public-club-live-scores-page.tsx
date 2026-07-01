import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  PublicClubDashboardLink,
  publicClubDetailStackClass,
} from "@/components/public-club/public-club-dashboard-link";
import { PublicClubLiveScoresPanel } from "@/components/public-club/public-club-live-scores-panel";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";

export default function PublicClubLiveScoresPage() {
  const { t } = useLanguage();
  const { club, user, isMember, teams, basePath, searchSuffix, openDashboardLiveScores } = usePublicClub();
  const homeHref = `${basePath}${searchSuffix}`;

  return (
    <PublicClubPageGate section="livescores">
      <PublicClubSection
        title={t.clubPage.liveScoresPublicTitle}
        subtitle={t.clubPage.liveScoresPublicPageSubtitle}
        className="[&_.public-club-section-body]:text-left"
      >
        {club ? (
          <div className="space-y-6">
            <PublicClubLiveScoresPanel
              clubId={club.id}
              clubName={club.name}
              teams={teams}
              basePath={basePath}
              searchSuffix={searchSuffix}
            />
            {user && isMember ? (
              <div className={publicClubDetailStackClass}>
                <PublicClubDashboardLink
                  hint={t.clubPage.liveScoresDashboardHint}
                  label={t.clubPage.openDashboardLiveScores}
                  onClick={openDashboardLiveScores}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={`${publicClubDetailStackClass} pt-2`}>
          <Link
            to={homeHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.clubPage.liveScoresBackToHome}
          </Link>
        </div>
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
