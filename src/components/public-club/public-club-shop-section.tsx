import { ArrowRight, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { PublicClubShopProductGrid } from "@/components/public-club/public-club-shop-product-grid";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { TSV_ALLACH_JAKO_TEAMSHOP_URL } from "@/lib/tsv-allach-jako-shop-catalog";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";

interface PublicClubShopSectionProps {
  showAdminDraftEmptyHints?: boolean;
}

export function PublicClubShopSection({ showAdminDraftEmptyHints = false }: PublicClubShopSectionProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { club, shopProducts, user, isMember, goToAuthWithReturn, basePath, searchSuffix } = usePublicClub();
  const priceLocale = language === "de" ? "de-DE" : "en-US";
  const priceFromLabel = language === "de" ? "ab" : "from";

  if (!club?.sectionVisibility.shop) return null;

  const isTsvAllach = isTsvAllachClub(club);
  const products = shopProducts.filter((p) => p.is_active);
  const shopPageHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.shop}${searchSuffix}`;

  const openShop = () => {
    if (!club?.id) return;
    if (user && isMember) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      navigate("/shop");
      return;
    }
    goToAuthWithReturn("/shop");
  };

  if (products.length === 0) {
    if (!showAdminDraftEmptyHints) return null;
    return (
      <PublicClubSection title={t.clubPage.shopSection}>
        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintShop}</PublicClubDraftEmptyHint>
      </PublicClubSection>
    );
  }

  return (
    <PublicClubSection title={t.clubPage.shopSection} subtitle={t.clubPage.shopDesc}>
      {isTsvAllach ? (
        <p className="mb-6 text-center text-xs text-[color:var(--club-muted)] md:text-left">
          {t.clubPage.shopJakoPartnerNote}{" "}
          <a
            href={TSV_ALLACH_JAKO_TEAMSHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[color:var(--club-primary)] hover:underline"
          >
            JAKO Teamshop
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      ) : null}

      <PublicClubShopProductGrid
        products={products}
        priceLocale={priceLocale}
        priceFromLabel={priceFromLabel}
        externalOrderLabel={t.clubPage.shopExternalOrder}
      />

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <PublicClubButton appearance="primary" onClick={openShop}>
          {t.clubPage.openShop}
          <ArrowRight className="ml-1 h-4 w-4" />
        </PublicClubButton>
        <Link
          to={shopPageHref}
          className="text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
        >
          {t.clubPage.shopViewAllProducts}
          <ArrowRight className="ml-1 inline h-4 w-4" />
        </Link>
      </div>
    </PublicClubSection>
  );
}
