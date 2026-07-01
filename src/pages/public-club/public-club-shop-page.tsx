import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Loader2, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { PublicClubShopProductGrid } from "@/components/public-club/public-club-shop-product-grid";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { supabaseDynamic } from "@/lib/supabase-dynamic";
import { isTsvAllachClub } from "@/lib/is-tsv-allach-club";
import { TSV_ALLACH_JAKO_TEAMSHOP_URL } from "@/lib/tsv-allach-jako-shop-catalog";
import type { ShopProductLite } from "@/lib/public-club-models";
import { normalizeSectionSearch } from "@/lib/public-club-models";

export default function PublicClubShopPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { club, user, isMember, goToAuthWithReturn, basePath, searchSuffix, showAdminDraftEmptyHints } = usePublicClub();
  const priceLocale = language === "de" ? "de-DE" : "en-US";
  const priceFromLabel = language === "de" ? "ab" : "from";

  const [products, setProducts] = useState<ShopProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const loadProducts = useCallback(async () => {
    if (!club?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabaseDynamic
      .from("shop_products")
      .select("id, name, description, price_eur, price_max_eur, image_url, image_urls, external_url, product_meta, stock, is_active")
      .eq("club_id", club.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(48);

    if (error) {
      setProducts([]);
    } else {
      setProducts((data as ShopProductLite[]) ?? []);
    }
    setLoading(false);
  }, [club?.id]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    const needle = normalizeSectionSearch(q);
    if (!needle) return products;
    return products.filter((p) => normalizeSectionSearch(`${p.name} ${p.description ?? ""}`).includes(needle));
  }, [products, q]);

  const isTsvAllach = isTsvAllachClub(club);
  const homeHref = `${basePath}${searchSuffix}`;

  const openMemberShop = () => {
    if (!club?.id) return;
    if (user && isMember) {
      localStorage.setItem(`one4team.activeClubId:${user.id}`, club.id);
      navigate("/shop");
      return;
    }
    goToAuthWithReturn("/shop");
  };

  return (
    <PublicClubPageGate section="shop">
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

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--club-muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.clubPage.sectionSearchShop}
              className="pl-9 club-glass border-[color:var(--club-border)]"
            />
          </div>
          <PublicClubButton appearance="primary" className="shrink-0" onClick={openMemberShop}>
            {t.clubPage.openShop}
            <ArrowRight className="ml-1 h-4 w-4" />
          </PublicClubButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : filtered.length === 0 ? (
          showAdminDraftEmptyHints ? (
            <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintShop}</PublicClubDraftEmptyHint>
          ) : (
            <p className="text-center text-sm text-[color:var(--club-muted)] py-12">{t.clubPage.noSearchResults}</p>
          )
        ) : (
          <PublicClubShopProductGrid
            products={filtered}
            priceLocale={priceLocale}
            priceFromLabel={priceFromLabel}
            externalOrderLabel={t.clubPage.shopExternalOrder}
          />
        )}

        <div className="mt-10 text-center">
          <Link to={homeHref} className="text-sm font-semibold text-[color:var(--club-primary)] hover:underline">
            {t.clubPage.shopBackToHome}
          </Link>
        </div>
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
