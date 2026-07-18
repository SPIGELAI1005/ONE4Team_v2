import { Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { PUBLIC_CLUB_VISIBILITY_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { isHomepageModuleEnabled } from "@/lib/public-page-flex-config";

/** Homepage teaser — full progress lives on `/my-progress`. */
export function PublicClubMyProgressTeaser() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { club, user, isMember, basePath, searchSuffix, goToAuthWithReturn } = usePublicClub();

  if (!club || !isHomepageModuleEnabled(club.publicPageLayout, "myProgress")) return null;

  const progressHref = `${basePath}/${PUBLIC_CLUB_VISIBILITY_ROUTE_SEGMENTS.progress}${searchSuffix}`;

  function openProgress() {
    if (!user) {
      goToAuthWithReturn(progressHref);
      return;
    }
    navigate(progressHref);
  }

  const teaserBody =
    t.clubPage.progressHomeTeaserBody ??
    "Training attendance, match selection, self-evaluation, and AI 4 T tips. Open your full progress board.";

  return (
    <PublicClubSection
      id="my-progress"
      title={t.clubProgress.sectionTitle}
      subtitle={
        <BrandedText
          text={t.clubPage.progressHomeTeaserDesc ?? t.clubProgress.sectionDesc}
          ai4tOnly
        />
      }
    >
      <PublicClubCard className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/10">
          <Trophy className="h-8 w-8 text-[color:var(--club-primary)]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">
            {t.clubPage.progressHomeTeaserTitle ?? t.clubProgress.sectionTitle}
          </h3>
          <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">
            <BrandedText text={teaserBody} ai4tOnly />
          </p>
          {user && isMember ? (
            <p className="text-xs text-[color:var(--club-muted)]">
              {t.clubPage.progressHomeTeaserMemberHint ??
                "Also available from your profile menu."}
            </p>
          ) : null}
        </div>
        <PublicClubButton appearance="primary" className="w-full shrink-0 sm:w-auto" onClick={openProgress}>
          {user
            ? t.clubPage.progressHomeTeaserCtaSignedIn ?? t.clubProgress.sectionTitle
            : t.clubPage.progressHomeTeaserCtaSignedOut ?? t.clubProgress.signInCta}
        </PublicClubButton>
      </PublicClubCard>
    </PublicClubSection>
  );
}
