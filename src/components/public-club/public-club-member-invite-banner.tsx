import { Link2, LogIn, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePublicClub } from "@/contexts/public-club-context";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { buildClubInviteRedeemUrl } from "@/lib/club-invite-links";
import { clubCtaFillHoverClass, clubCtaPrimaryInlineStyle } from "@/lib/public-club-cta-classes";

/** Shown when an admin invite link opens the public club page (`?invite=`). */
export function PublicClubMemberInviteBanner() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { club, basePath, searchSuffix, goToAuthWithReturn } = usePublicClub();

  const inviteToken = searchParams.get("invite")?.trim() ?? "";

  const returnPath = useMemo(
    () => `${basePath}${searchSuffix}`,
    [basePath, searchSuffix],
  );

  if (!club || inviteToken.length < 10) return null;

  const redeemUrl = buildClubInviteRedeemUrl({
    inviteToken,
    clubSlug: club.slug,
    siteOrigin: window.location.origin,
  });

  return (
    <div className="border-b border-[color:var(--club-primary)]/25 bg-[color:var(--club-primary)]/10 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--club-foreground)]">
            {t.clubPage.memberInviteBannerTitle.replace("{clubName}", club.name)}
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--club-muted)]">{t.clubPage.memberInviteBannerDesc}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {user ? (
            <Button
              size="sm"
              className={`font-semibold ${clubCtaFillHoverClass}`}
              style={clubCtaPrimaryInlineStyle(club.primary_color)}
              onClick={() => navigate(redeemUrl)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              {t.clubPage.memberInviteAcceptCta}
            </Button>
          ) : (
            <Button
              size="sm"
              className={`font-semibold ${clubCtaFillHoverClass}`}
              style={clubCtaPrimaryInlineStyle(club.primary_color)}
              onClick={() => goToAuthWithReturn(returnPath)}
            >
              <LogIn className="mr-1.5 h-4 w-4" />
              {t.clubPage.memberInviteSignInCta}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-[color:var(--club-border)] bg-white/5 text-[color:var(--club-foreground)]"
            onClick={() => navigate(`${basePath}/join${searchSuffix}`)}
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            {t.clubPage.memberInviteJoinPageCta}
          </Button>
        </div>
      </div>
    </div>
  );
}
