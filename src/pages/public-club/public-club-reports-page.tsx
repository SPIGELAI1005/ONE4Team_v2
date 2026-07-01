import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  PublicClubDashboardLink,
  publicClubDetailStackClass,
} from "@/components/public-club/public-club-dashboard-link";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubReportsPanel } from "@/components/public-club/public-club-reports-panel";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { PUBLIC_CLUB_VISIBILITY_ROUTE_SEGMENTS } from "@/lib/public-club-routes";

export default function PublicClubReportsPage() {
  const { t } = useLanguage();
  const {
    club,
    user,
    isMember,
    membershipId,
    membershipRole,
    checkingMembership,
    basePath,
    searchSuffix,
    goToAuthWithReturn,
    openDashboardReports,
  } = usePublicClub();

  const pagePath = `${basePath}/${PUBLIC_CLUB_VISIBILITY_ROUTE_SEGMENTS.reports}${searchSuffix}`;
  const homeHref = `${basePath}${searchSuffix}`;

  return (
    <PublicClubPageGate section="reports">
      <PublicClubSection
        title={t.clubPage.reportsSection}
        subtitle={t.clubPage.reportsPublicPageSubtitle}
        className="[&_.public-club-section-body]:text-left"
      >
        {!user ? (
          <div className={publicClubDetailStackClass}>
            <PublicClubCard className="space-y-4 p-8 text-center sm:text-left">
              <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.reportsSignInRequired}</p>
              <PublicClubButton appearance="primary" className="w-full sm:w-auto" onClick={() => goToAuthWithReturn(pagePath)}>
                {t.clubPage.reportsCtaSignedOut}
              </PublicClubButton>
            </PublicClubCard>
          </div>
        ) : checkingMembership ? (
          <div className={`${publicClubDetailStackClass} py-16 text-sm text-[color:var(--club-muted)]`}>{t.common.loading}</div>
        ) : !isMember || !membershipId ? (
          <div className={publicClubDetailStackClass}>
            <PublicClubCard className="space-y-4 p-8 text-center sm:text-left">
              <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.reportsMemberRequired}</p>
              <PublicClubButton
                appearance="primary"
                className="w-full sm:w-auto"
                onClick={() => goToAuthWithReturn(`${basePath}/join${searchSuffix}`)}
              >
                {t.clubPage.reportsJoinCta}
              </PublicClubButton>
            </PublicClubCard>
          </div>
        ) : club ? (
          <div className="space-y-6">
            <PublicClubReportsPanel
              clubId={club.id}
              membershipId={membershipId}
              membershipRole={membershipRole}
              basePath={basePath}
              searchSuffix={searchSuffix}
            />
            <div className={publicClubDetailStackClass}>
              <PublicClubDashboardLink
                hint={t.clubPage.reportsDashboardHint}
                label={t.clubPage.openDashboardReports}
                onClick={openDashboardReports}
              />
            </div>
          </div>
        ) : null}

        <div className={`${publicClubDetailStackClass} pt-2`}>
          <Link
            to={homeHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.clubPage.reportsBackToHome}
          </Link>
        </div>
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
