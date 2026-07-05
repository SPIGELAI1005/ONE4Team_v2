import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { PublicClubNewsCard, PublicClubNewsPoster } from "@/components/public-club/public-club-news-card";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import type { NewsRowLite } from "@/lib/public-club-models";
import {
  normalizePublicNewsCategory,
  publicNewsExcerpt,
  PUBLIC_NEWS_CATEGORIES,
  type PublicNewsCategoryId,
} from "@/lib/public-club-news";
import { mergePublicClubNews } from "@/lib/tsv-allach-public-news";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { clubCtaFillHoverClass, clubCtaOutlineButtonClass, clubCtaOutlineHoverClass } from "@/lib/public-club-cta-classes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const MOCK_FLAG = import.meta.env.VITE_PUBLIC_CLUB_NEWS_MOCK === "true";

type CategoryFilterId = "all" | PublicNewsCategoryId;

function mockPublicNews(): NewsRowLite[] {
  const now = new Date().toISOString();
  return [
    {
      id: "mock-demo-1",
      title: "New training ground project approved",
      content:
        "The club board approved the next phase of our training ground upgrade. Work will begin after the summer break, with new floodlights and an improved drainage system so sessions can run reliably through autumn.",
      created_at: now,
      priority: "normal",
      publish_to_public_website: true,
      public_news_category: "club",
      image_url: null,
      excerpt: "Funding covers pitches, lighting and drainage. More on timing for members next season.",
    },
    {
      id: "mock-demo-2",
      title: "U12 squad reaches regional semi-finals",
      content: "Congratulations to our U12 team and coaches for an outstanding cup run. Details on the semi-final venue and kickoff will follow this week.",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      priority: "high",
      publish_to_public_website: true,
      public_news_category: "youth",
      image_url: null,
      excerpt: null,
    },
    {
      id: "mock-demo-3",
      title: "Club summer festival: save the date",
      content: "Food stalls, mini tournaments and music on the main pitch. Volunteers welcome; contact the office to help out.",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      priority: "normal",
      publish_to_public_website: true,
      public_news_category: "events",
      image_url: null,
      excerpt: "A full day for families and teams. Mark your calendar and join us at the club.",
    },
  ];
}

export default function PublicClubNewsPage() {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { club, basePath, searchSuffix, showAdminDraftEmptyHints, activePageLanguage } = usePublicClub();

  const categoryText = useCallback(
    (id: PublicNewsCategoryId) => {
      const p = t.clubPage;
      if (id === "club") return p.newsCatClub;
      if (id === "teams") return p.newsCatTeams;
      if (id === "events") return p.newsCatEvents;
      if (id === "youth") return p.newsCatYouth;
      if (id === "seniors") return p.newsCatSeniors;
      return p.newsCatSponsors;
    },
    [t.clubPage]
  );

  const [category, setCategory] = useState<CategoryFilterId>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<NewsRowLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const buildQuery = useCallback(
    (from: number, to: number) => {
      if (!club?.id) return null;
      let q = supabase
        .from("announcements")
        .select(
          "id, title, content, created_at, priority, publish_to_public_website, public_news_category, image_url, excerpt"
        )
        .eq("club_id", club.id)
        .eq("publish_to_public_website", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (category !== "all") q = q.eq("public_news_category", category);
      const s = debouncedSearch.replace(/%/g, "").replace(/_/g, "").slice(0, 120);
      if (s)
        q = q.or(`title.ilike.%${s}%,content.ilike.%${s}%,excerpt.ilike.%${s}%`);
      return q;
    },
    [category, club?.id, debouncedSearch]
  );

  useEffect(() => {
    if (!club?.id || !MOCK_FLAG) return;
    let m = mockPublicNews();
    if (category !== "all") m = m.filter((n) => normalizePublicNewsCategory(n.public_news_category) === category);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) m = m.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    setItems(m);
    setHasMore(false);
    setOffset(m.length);
    setLoading(false);
  }, [category, club?.id, debouncedSearch]);

  const resetAndLoad = useCallback(async () => {
    if (!club?.id || MOCK_FLAG) return;
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    const q = buildQuery(0, PAGE_SIZE - 1);
    if (!q) {
      setLoading(false);
      return;
    }
    const { data, error } = await q;
    if (error) {
      setItems([]);
      setHasMore(false);
    } else {
      const dbRows = (data as NewsRowLite[]) || [];
      const rows = mergePublicClubNews(club, dbRows, activePageLanguage);
      setItems(rows);
      setHasMore(dbRows.length === PAGE_SIZE);
      setOffset(dbRows.length);
    }
    setLoading(false);
  }, [activePageLanguage, buildQuery, club]);

  useEffect(() => {
    if (!club?.id || MOCK_FLAG) return;
    void resetAndLoad();
  }, [club?.id, resetAndLoad]);

  const loadMore = useCallback(async () => {
    if (!club?.id || MOCK_FLAG || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const q = buildQuery(offset, offset + PAGE_SIZE - 1);
    if (!q) {
      setLoadingMore(false);
      return;
    }
    const { data, error } = await q;
    if (!error && data?.length) {
      const dbRows = (data as NewsRowLite[]) || [];
      setItems((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const row of dbRows) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
      setHasMore(dbRows.length === PAGE_SIZE);
      setOffset((o) => o + dbRows.length);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [buildQuery, club?.id, hasMore, loadingMore, offset]);

  const subtitle = club?.news_page_subtitle?.trim() || t.clubPage.newsPageDefaultSubtitle;

  const featuredArticle = useMemo(() => {
    if (!club?.featured_news_ids?.length || !items.length) return null;
    for (const id of club.featured_news_ids) {
      const hit = items.find((a) => a.id === id);
      if (hit) return hit;
    }
    return null;
  }, [club?.featured_news_ids, items]);

  const gridItems = useMemo(() => {
    if (!featuredArticle) return items;
    return items.filter((a) => a.id !== featuredArticle.id);
  }, [featuredArticle, items]);

  const categoryTabs: { id: CategoryFilterId; label: string }[] = useMemo(
    () => [
      { id: "all", label: t.clubPage.newsCatAll },
      ...PUBLIC_NEWS_CATEGORIES.map((id) => ({ id, label: categoryText(id) })),
    ],
    [categoryText, t.clubPage.newsCatAll]
  );

  const showDedicatedEmpty =
    !MOCK_FLAG && !loading && items.length === 0 && category === "all" && !debouncedSearch;
  const showFilteredEmpty = !loading && items.length === 0 && !showDedicatedEmpty;
  const showMockBanner = MOCK_FLAG && items.length > 0;

  return (
    <PublicClubPageGate section="news">
      <PublicClubSection title={t.clubPage.newsPageTitle} subtitle={subtitle}>
        {showMockBanner ? (
          <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-[11px] text-amber-950 dark:text-amber-100">
            {t.clubPage.newsMockBanner}
          </p>
        ) : null}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  category === tab.id
                    ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
                    : `border-[color:var(--club-border)] text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)] ${clubCtaOutlineHoverClass}`
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="w-full shrink-0 sm:max-w-xs">
            <Input
              id="public-club-news-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.clubPage.newsSearchPlaceholder}
              className="rounded-xl club-glass text-[color:var(--club-foreground)] placeholder:text-[color:var(--club-muted)]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : showDedicatedEmpty ? (
          <div className="mx-auto max-w-lg rounded-2xl club-glass px-6 py-12 text-center">
            <p className="text-sm font-medium text-[color:var(--club-foreground)]">{t.clubPage.newsEmptyDedicated}</p>
            {showAdminDraftEmptyHints ? (
              <div className="mt-4 text-left">
                <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintNews}</PublicClubDraftEmptyHint>
              </div>
            ) : null}
          </div>
        ) : showFilteredEmpty ? (
          <p className="rounded-2xl club-glass py-12 text-center text-sm text-[color:var(--club-muted)]">
            {t.clubPage.noSearchResults}
          </p>
        ) : (
          <>
            {featuredArticle && (category === "all" || normalizePublicNewsCategory(featuredArticle.public_news_category) === category) ? (
              <Link
                to={`${basePath}/news/${featuredArticle.id}${searchSuffix}`}
                className="group mb-10 flex min-h-[200px] overflow-hidden rounded-3xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] text-left no-underline shadow-[0_16px_48px_rgba(0,0,0,0.18)] transition-colors hover:border-[color:var(--club-primary)]/45"
              >
                <div className="flex min-w-0 flex-1 flex-col justify-center p-6 sm:p-8 lg:p-10">
                  <span className="mb-3 inline-flex w-fit rounded-full bg-[color:var(--club-primary)]/15 px-2.5 py-0.5 text-[10px] font-medium text-[color:var(--club-primary)]">
                    {categoryText(normalizePublicNewsCategory(featuredArticle.public_news_category))}
                  </span>
                  <h2 className="font-display text-2xl font-bold leading-tight text-[color:var(--club-foreground)] transition-colors group-hover:text-[color:var(--club-primary)] sm:text-3xl">
                    {featuredArticle.title}
                  </h2>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[color:var(--club-muted)] sm:text-base">
                    {publicNewsExcerpt(featuredArticle)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-[color:var(--club-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(featuredArticle.created_at).toLocaleDateString(locale)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full bg-[color:var(--club-primary)] px-4 py-2 text-xs font-semibold ${clubCtaFillHoverClass}`}
                      style={{ color: readableTextOnSolid(club?.primary_color || "#C4A052") }}
                    >
                      {t.clubPage.newsReadMore}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
                <PublicClubNewsPoster
                  imageUrl={featuredArticle.image_url}
                  title={featuredArticle.title}
                  className="w-[34%] min-w-[120px] max-w-[240px] border-l border-[color:var(--club-border)] sm:max-w-[280px] aspect-[210/297]"
                />
              </Link>
            ) : null}

            {gridItems.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gridItems.map((item) => (
                  <PublicClubNewsCard
                    key={item.id}
                    item={item}
                    href={`${basePath}/news/${item.id}${searchSuffix}`}
                    locale={locale}
                    categoryLabel={categoryText(normalizePublicNewsCategory(item.public_news_category))}
                    readMoreLabel={t.clubPage.newsReadMore}
                    variant="compact"
                    className="h-full"
                  />
                ))}
              </div>
            ) : featuredArticle ? null : items.length === 0 ? null : (
              <p className="rounded-2xl club-glass py-10 text-center text-sm text-[color:var(--club-muted)]">
                {t.clubPage.noSearchResults}
              </p>
            )}

            {hasMore && !MOCK_FLAG ? (
              <div className="mt-10 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className={`rounded-full ${clubCtaOutlineButtonClass}`}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.clubPage.newsLoadingMore}
                    </>
                  ) : (
                    t.clubPage.newsLoadMore
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
