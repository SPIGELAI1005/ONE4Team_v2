import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { publicClubSectionContainer } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import { useLanguage } from "@/hooks/use-language";
import type { NewsRowLite } from "@/lib/public-club-models";
import { buildNewsArticleJsonLd, publicClubSiteOrigin, toAbsoluteUrl } from "@/lib/public-club-seo";
import { normalizePublicNewsCategory, publicNewsExcerpt } from "@/lib/public-club-news";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";

export default function PublicClubNewsArticlePage() {
  const { newsId = "" } = useParams();
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { club, basePath, searchSuffix } = usePublicClub();
  const { setExtras } = usePublicClubRouteSeo();
  const [article, setArticle] = useState<NewsRowLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!club?.id || !newsId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, title, content, created_at, priority, publish_to_public_website, public_news_category, image_url, excerpt"
        )
        .eq("club_id", club.id)
        .eq("id", newsId)
        .eq("publish_to_public_website", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setArticle(null);
        setNotFound(true);
      } else {
        setArticle(data as NewsRowLite);
        setNotFound(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id, newsId]);

  useEffect(() => {
    if (!club || !article) {
      setExtras(null);
      return;
    }
    const origin = publicClubSiteOrigin();
    const desc = publicNewsExcerpt(article);
    const path = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.news}/${newsId}`;
    const url = origin ? `${origin}${path}` : path;
    const imgAbs = toAbsoluteUrl(article.image_url, origin);
    const logoAbs = toAbsoluteUrl(club.logo_url, origin);
    setExtras({
      title: article.title,
      description: desc,
      ogImageUrl: article.image_url?.trim() || null,
      ogType: "article",
      structuredDataNodes: [
        buildNewsArticleJsonLd({
          headline: article.title,
          url,
          description: desc,
          imageUrl: imgAbs,
          datePublished: article.created_at,
          publisherName: club.name,
          publisherLogoUrl: logoAbs,
        }),
      ],
    });
    return () => setExtras(null);
  }, [article, basePath, club, newsId, setExtras]);

  const categoryLabel = (id: ReturnType<typeof normalizePublicNewsCategory>) => {
    const p = t.clubPage;
    if (id === "club") return p.newsCatClub;
    if (id === "teams") return p.newsCatTeams;
    if (id === "events") return p.newsCatEvents;
    if (id === "youth") return p.newsCatYouth;
    if (id === "seniors") return p.newsCatSeniors;
    return p.newsCatSponsors;
  };

  const listHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.news}${searchSuffix}`;

  return (
    <PublicClubPageGate section="news">
      <div className={`${publicClubSectionContainer} py-10 sm:py-14`}>
        <Link
          to={listHref}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--club-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.clubPage.newsBackToList}
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : notFound || !article ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-6 py-12 text-center">
            <p className="text-sm font-medium text-[color:var(--club-foreground)]">{t.clubPage.newsArticleNotFound}</p>
            <Link to={listHref} className="mt-4 inline-block text-sm text-[color:var(--club-primary)] hover:underline">
              {t.clubPage.newsBackToList}
            </Link>
          </div>
        ) : (
          <article className="mx-auto max-w-3xl text-left">
            {article.image_url?.trim() ? (
              <div className="mb-8 overflow-hidden rounded-3xl border border-[color:var(--club-border)]">
                <img src={article.image_url} alt="" className="max-h-[420px] w-full object-cover" loading="lazy" />
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[color:var(--club-muted)]">
              <span className="rounded-full bg-[color:var(--club-primary)]/15 px-2.5 py-0.5 font-medium text-[color:var(--club-primary)]">
                {categoryLabel(normalizePublicNewsCategory(article.public_news_category))}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(article.created_at).toLocaleDateString(locale)}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-[color:var(--club-foreground)] sm:text-4xl">{article.title}</h1>
            <p className="mt-4 text-base leading-relaxed text-[color:var(--club-muted)]">{publicNewsExcerpt(article)}</p>
            <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-[color:var(--club-foreground)]">
              {article.content}
            </div>
          </article>
        )}
      </div>
    </PublicClubPageGate>
  );
}
