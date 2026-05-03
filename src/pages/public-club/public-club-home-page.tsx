import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  MapPin,
  Medal,
  Newspaper,
  Trophy,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicClubHero } from "@/components/public-club/public-club-hero";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import type { HomepageModuleId } from "@/lib/club-page-settings-helpers";
import {
  effectiveHomepageMaxItems,
  getHomepageRenderOrder,
  internalModuleToFlex,
  shouldRenderHomepageModule,
  type HomepageModuleRenderData,
} from "@/lib/public-page-flex-config";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { encodePublicTeamPathSegment } from "@/lib/public-club-team-slug";
import type { PublicMatchLite, TrainingSessionRowLite } from "@/lib/public-club-models";
import { normalizePublicNewsCategory, publicNewsExcerpt } from "@/lib/public-club-news";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { clubCtaFillHoverClass, clubCtaOutlineHoverClass } from "@/lib/public-club-cta-classes";

const HORIZON_MS = 12 * 3600000;
const MAX_FEATURED_TEAMS_CAP = 12;

function sessionStartMs(s: TrainingSessionRowLite) {
  return new Date(s.starts_at).getTime();
}

function nextTrainingFromSessions(sessions: TrainingSessionRowLite[]) {
  const now = Date.now();
  const horizon = now - HORIZON_MS;
  const sorted = [...sessions].sort((a, b) => sessionStartMs(a) - sessionStartMs(b));
  return sorted.find((s) => sessionStartMs(s) >= horizon) ?? null;
}

function isPublicScheduledMatch(m: PublicMatchLite) {
  return m.publish_to_public_schedule !== false;
}

function isPublicScheduledEvent(e: { publish_to_public_schedule?: boolean }) {
  return e.publish_to_public_schedule !== false;
}

export default function PublicClubHomePage() {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const {
    club,
    basePath,
    searchSuffix,
    loadingData,
    teams,
    sessions,
    events,
    news,
    publicMatchesUpcoming,
    publicPartners,
    memberCount,
    isMember,
    canRequestInvite,
    setShowRequestInvite,
    openDashboardOrAuth,
    showAdminDraftEmptyHints,
    publicCoachCountByTeamId,
  } = usePublicClub();

  const [publicDocumentsPreview, setPublicDocumentsPreview] = useState<{ id: string; title: string }[]>([]);

  const teamsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.teams}${searchSuffix}`;
  const scheduleHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.schedule}${searchSuffix}`;
  const newsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.news}${searchSuffix}`;
  const matchesHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}${searchSuffix}`;
  const eventsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.events}${searchSuffix}`;
  const documentsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.documents}${searchSuffix}`;

  const publicEvents = useMemo(() => events.filter(isPublicScheduledEvent), [events]);
  const publicMatchesUp = useMemo(
    () => publicMatchesUpcoming.filter(isPublicScheduledMatch),
    [publicMatchesUpcoming]
  );

  useEffect(() => {
    if (!club?.id || !club.sectionVisibility.documents || !club.micrositePrivacy.showDocumentsPublic) {
      setPublicDocumentsPreview([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("club_public_documents")
        .select("id, title")
        .eq("club_id", club.id)
        .eq("is_public", true)
        .eq("contains_personal_data", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(3);
      if (cancelled) return;
      if (error) {
        setPublicDocumentsPreview([]);
        return;
      }
      setPublicDocumentsPreview(((data as { id: string; title: string }[]) || []).filter((r) => r.title));
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id, club?.micrositePrivacy.showDocumentsPublic, club?.sectionVisibility.documents]);

  const homepageRenderOrder = useMemo(() => (club ? getHomepageRenderOrder(club.publicPageLayout) : [] as HomepageModuleId[]), [club]);

  const coachStatCount = useMemo(() => {
    if (!club) return 0;
    if (club.micrositePrivacy.showCoachNamesPublic) {
      const names = new Set<string>();
      for (const tm of teams) {
        const n = tm.coach_name?.trim();
        if (n) names.add(n.toLowerCase());
      }
      return names.size;
    }
    let n = 0;
    for (const v of Object.values(publicCoachCountByTeamId)) n += v;
    return n;
  }, [club, publicCoachCountByTeamId, teams]);

  const nowMs = Date.now();
  const upcomingTrainingsCount = useMemo(
    () => sessions.filter((s) => sessionStartMs(s) >= nowMs - HORIZON_MS).length,
    [sessions, nowMs]
  );
  const upcomingMatchesCount = useMemo(
    () => publicMatchesUp.filter((m) => new Date(m.match_date).getTime() >= Date.now() - 6 * 3600000).length,
    [publicMatchesUp]
  );
  const upcomingEventsCount = useMemo(
    () => publicEvents.filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 6 * 3600000).length,
    [publicEvents]
  );

  const nextTraining = useMemo(() => nextTrainingFromSessions(sessions), [sessions]);
  const nextMatch = useMemo(() => {
    const now = Date.now();
    const sorted = [...publicMatchesUp].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    return sorted.find((m) => new Date(m.match_date).getTime() >= now - 6 * 3600000) ?? null;
  }, [publicMatchesUp]);
  const nextEvent = useMemo(() => {
    const now = Date.now();
    const sorted = [...publicEvents].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return sorted.find((e) => new Date(e.starts_at).getTime() >= now - 6 * 3600000) ?? null;
  }, [publicEvents]);

  type NextKind = "training" | "match" | "event";
  const nextUpItems = useMemo(() => {
    if (!club) return [];
    const items: { kind: NextKind; at: number; label: string; title: string; href: string; meta?: string }[] = [];
    if (nextTraining && club.sectionVisibility.schedule) {
      items.push({
        kind: "training",
        at: sessionStartMs(nextTraining),
        label: t.clubPage.homeNextTrainingLabel,
        title: nextTraining.title,
        href: scheduleHref,
        meta: [nextTraining.teams?.name, nextTraining.location].filter(Boolean).join(" · ") || undefined,
      });
    }
    if (nextMatch && club.sectionVisibility.matches) {
      const at = new Date(nextMatch.match_date).getTime();
      items.push({
        kind: "match",
        at,
        label: t.clubPage.homeNextMatchLabel,
        title: nextMatch.is_home ? `${club.name} vs ${nextMatch.opponent}` : `${nextMatch.opponent} vs ${club.name}`,
        href: matchesHref,
        meta: nextMatch.location ?? undefined,
      });
    }
    if (nextEvent && club.sectionVisibility.events) {
      items.push({
        kind: "event",
        at: new Date(nextEvent.starts_at).getTime(),
        label: t.clubPage.homeNextEventLabel,
        title: nextEvent.title,
        href: eventsHref,
        meta: nextEvent.location ?? undefined,
      });
    }
    return items.sort((a, b) => a.at - b.at).slice(0, 3);
  }, [club, eventsHref, matchesHref, nextEvent, nextMatch, nextTraining, scheduleHref, t.clubPage]);

  const latestNewsMax = club
    ? Math.min(12, effectiveHomepageMaxItems("latest_news", club.publicPageLayout, club.homepageModuleDefs))
    : 3;
  const latestNews = useMemo(() => news.slice(0, latestNewsMax), [news, latestNewsMax]);

  const featuredCap = club
    ? Math.min(MAX_FEATURED_TEAMS_CAP, effectiveHomepageMaxItems("featured_teams", club.publicPageLayout, club.homepageModuleDefs))
    : 6;
  const featuredTeams = useMemo(() => {
    const byId = new Map(teams.map((x) => [x.id, x]));
    const ordered = club?.featured_team_ids
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    if (ordered && ordered.length > 0) return ordered.slice(0, featuredCap);
    return teams.slice(0, featuredCap);
  }, [club?.featured_team_ids, teams, featuredCap]);

  const showStats = Boolean(
    club &&
      ((club.sectionVisibility.teams && teams.length > 0) ||
        (club.sectionVisibility.teams && coachStatCount > 0) ||
        (club.sectionVisibility.schedule && upcomingTrainingsCount > 0) ||
        (club.sectionVisibility.matches && upcomingMatchesCount > 0) ||
        (club.sectionVisibility.events && upcomingEventsCount > 0))
  );

  const eventsPreviewMax = club
    ? Math.min(12, effectiveHomepageMaxItems("upcoming_events", club.publicPageLayout, club.homepageModuleDefs))
    : 6;
  const homeEventsPreview = useMemo(() => {
    const now = Date.now() - 6 * 3600000;
    return [...publicEvents]
      .filter((e) => new Date(e.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, eventsPreviewMax);
  }, [publicEvents, eventsPreviewMax]);

  const matchesPreviewMax = club
    ? Math.min(12, effectiveHomepageMaxItems("matches_preview", club.publicPageLayout, club.homepageModuleDefs))
    : 6;
  const homeMatchesPreview = useMemo(() => {
    const now = Date.now() - 6 * 3600000;
    return [...publicMatchesUp]
      .filter((m) => new Date(m.match_date).getTime() >= now)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .slice(0, matchesPreviewMax);
  }, [publicMatchesUp, matchesPreviewMax]);

  const galleryUrls = useMemo(
    () => (club?.reference_images ?? []).map((u) => String(u).trim()).filter(Boolean).slice(0, 8),
    [club?.reference_images]
  );
  const galleryMax = club
    ? Math.min(24, effectiveHomepageMaxItems("gallery", club.publicPageLayout, club.homepageModuleDefs))
    : 8;
  const gallerySlice = useMemo(() => galleryUrls.slice(0, galleryMax), [galleryUrls, galleryMax]);

  const showPartnersStrip = Boolean(
    club?.homepageModuleDefs?.sponsors.visible !== false && club?.homepage_module_partners && publicPartners.length > 0
  );
  const showJoinCta = Boolean(club?.sectionVisibility.nextsteps && canRequestInvite);

  const moduleRenderData = useMemo((): HomepageModuleRenderData | null => {
    if (!club) return null;
    return {
      club: {
        sectionVisibility: club.sectionVisibility,
        homepageModuleDefs: club.homepageModuleDefs,
      },
      showStats,
      nextUpItemsLength: nextUpItems.length,
      latestNewsCount: latestNews.length,
      featuredTeamsCount: featuredTeams.length,
      homeEventsPreviewCount: homeEventsPreview.length,
      homeMatchesPreviewCount: homeMatchesPreview.length,
      showPartnersStrip,
      showJoinCta,
      gallerySliceCount: gallerySlice.length,
    };
  }, [
    club,
    showStats,
    nextUpItems.length,
    latestNews.length,
    featuredTeams.length,
    homeEventsPreview.length,
    homeMatchesPreview.length,
    showPartnersStrip,
    showJoinCta,
    gallerySlice.length,
  ]);

  const heroCtaClass =
    "inline-flex min-h-[44px] flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] transition-colors hover:!border-accent/50 hover:!bg-accent hover:!text-accent-foreground sm:flex-none";

  return (
    <PublicClubPageGate section="home">
      {club ? (
        <>
          <PublicClubHero
            club={club}
            subtitle={club.description?.trim() || null}
            heroActions={
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {club.sectionVisibility.teams ? (
                  <Link to={teamsHref} className={heroCtaClass}>
                    <Trophy className="h-4 w-4 shrink-0" />
                    {t.clubPage.homeViewTeams}
                  </Link>
                ) : null}
                {club.sectionVisibility.schedule ? (
                  <Link to={scheduleHref} className={heroCtaClass}>
                    <Calendar className="h-4 w-4 shrink-0" />
                    {t.clubPage.homeNextTraining}
                  </Link>
                ) : null}
                {club.sectionVisibility.nextsteps && canRequestInvite && !isMember ? (
                  <Button
                    type="button"
                    size="lg"
                    className={`${heroCtaClass} border-transparent ${clubCtaFillHoverClass}`}
                    style={{
                      backgroundColor: "var(--club-primary)",
                      color: readableTextOnSolid(club.primary_color || "#C4A052"),
                    }}
                    onClick={() => setShowRequestInvite(true)}
                  >
                    {t.clubPage.homeJoinOrInvite}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  className={`${heroCtaClass} border-transparent font-semibold ${clubCtaFillHoverClass}`}
                  style={{
                    backgroundColor: "var(--club-support)",
                    color: readableTextOnSolid(club.support_color || "#22C55E"),
                  }}
                  onClick={openDashboardOrAuth}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t.clubPage.openDashboard}
                </Button>
              </div>
            }
            footNote={
              <>
                {!canRequestInvite ? <div>{t.clubPage.privateClub}</div> : null}
                {club.join_approval_mode === "auto" ? <div className="mt-1">{t.clubPage.autoJoinEnabled}</div> : null}
              </>
            }
          />

          {loadingData ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[color:var(--club-primary)]" />
            </div>
          ) : null}

          {!loadingData && moduleRenderData
            ? homepageRenderOrder.map((moduleId) => {
                const flexId = internalModuleToFlex(moduleId);
                if (!club.publicPageLayout.homepageModules[flexId].enabled) return null;
                if (!shouldRenderHomepageModule(moduleId, club.publicPageLayout, moduleRenderData, showAdminDraftEmptyHints)) {
                  return null;
                }

                if (moduleId === "stats") {
                  if (showStats)
                    return (
                      <Fragment key="stats">
                        <PublicClubSection title={t.clubPage.homeQuickStatsTitle}>
                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {club.sectionVisibility.teams ? (
                              <PublicClubCard padding="sm" className="text-center">
                                <Trophy className="mx-auto mb-2 h-7 w-7" style={{ color: "var(--club-primary)" }} />
                                <div className="font-display text-2xl font-bold text-[color:var(--club-foreground)]">{teams.length}</div>
                                <div className="text-xs font-medium text-[color:var(--club-muted)]">{t.clubPage.homeStatTeams}</div>
                              </PublicClubCard>
                            ) : null}
                            {club.sectionVisibility.teams && coachStatCount > 0 ? (
                              <PublicClubCard padding="sm" className="text-center">
                                <UserCircle className="mx-auto mb-2 h-7 w-7" style={{ color: "var(--club-primary)" }} />
                                <div className="font-display text-2xl font-bold text-[color:var(--club-foreground)]">{coachStatCount}</div>
                                <div className="text-xs font-medium text-[color:var(--club-muted)]">{t.clubPage.homeStatCoaches}</div>
                              </PublicClubCard>
                            ) : null}
                            {club.sectionVisibility.schedule && upcomingTrainingsCount > 0 ? (
                              <PublicClubCard padding="sm" className="text-center">
                                <Calendar className="mx-auto mb-2 h-7 w-7" style={{ color: "var(--club-primary)" }} />
                                <div className="font-display text-2xl font-bold text-[color:var(--club-foreground)]">{upcomingTrainingsCount}</div>
                                <div className="text-xs font-medium text-[color:var(--club-muted)]">{t.clubPage.homeStatUpcomingTrainings}</div>
                              </PublicClubCard>
                            ) : null}
                            {club.sectionVisibility.matches && upcomingMatchesCount > 0 ? (
                              <PublicClubCard padding="sm" className="text-center">
                                <Medal className="mx-auto mb-2 h-7 w-7" style={{ color: "var(--club-primary)" }} />
                                <div className="font-display text-2xl font-bold text-[color:var(--club-foreground)]">{upcomingMatchesCount}</div>
                                <div className="text-xs font-medium text-[color:var(--club-muted)]">{t.clubPage.homeStatUpcomingMatches}</div>
                              </PublicClubCard>
                            ) : null}
                            {club.sectionVisibility.events && upcomingEventsCount > 0 ? (
                              <PublicClubCard padding="sm" className="text-center">
                                <Calendar className="mx-auto mb-2 h-7 w-7" style={{ color: "var(--club-primary)" }} />
                                <div className="font-display text-2xl font-bold text-[color:var(--club-foreground)]">{upcomingEventsCount}</div>
                                <div className="text-xs font-medium text-[color:var(--club-muted)]">{t.clubPage.homeStatUpcomingEvents}</div>
                              </PublicClubCard>
                            ) : null}
                          </div>
                          {!club.visibility_hide_member_count_on_home && memberCount >= 12 ? (
                            <p className="mt-4 text-center text-[11px] text-[color:var(--club-muted)]">
                              {t.clubPage.membersCount}: {memberCount}
                            </p>
                          ) : null}
                        </PublicClubSection>
                      </Fragment>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="stats-empty" title={t.clubPage.homeQuickStatsTitle}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintStats}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "next_up") {
                  if (nextUpItems.length > 0)
                    return (
                      <PublicClubSection key="next_up" title={t.clubPage.homeNextUpTitle}>
                        <div className="grid gap-3 md:grid-cols-3">
                          {nextUpItems.map((item) => (
                            <Link
                              key={`${item.kind}-${item.at}`}
                              to={item.href}
                              className="block rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-left no-underline transition-colors hover:border-[color:var(--club-primary)]/50"
                            >
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-primary)]">{item.label}</div>
                              <div className="mt-1 font-display text-base font-semibold leading-snug text-[color:var(--club-foreground)]">{item.title}</div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--club-muted)]">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  {new Date(item.at).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {item.meta ? (
                                  <span className="inline-flex min-w-0 items-start gap-1">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="line-clamp-2">{item.meta}</span>
                                  </span>
                                ) : null}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </PublicClubSection>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="next_up-empty" title={t.clubPage.homeNextUpTitle}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintNextUp}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "latest_news") {
                  if (!club.sectionVisibility.news) return null;
                  if (latestNews.length > 0)
                    return (
                      <PublicClubSection key="latest_news" title={t.clubPage.homeLatestNewsTitle}>
                        <div className="grid gap-3 md:grid-cols-3">
                          {latestNews.map((item) => {
                            const cat = normalizePublicNewsCategory(item.public_news_category);
                            const catLabel =
                              cat === "club"
                                ? t.clubPage.newsCatClub
                                : cat === "teams"
                                  ? t.clubPage.newsCatTeams
                                  : cat === "events"
                                    ? t.clubPage.newsCatEvents
                                    : cat === "youth"
                                      ? t.clubPage.newsCatYouth
                                      : cat === "seniors"
                                        ? t.clubPage.newsCatSeniors
                                        : t.clubPage.newsCatSponsors;
                            return (
                              <PublicClubCard key={item.id} padding="md" className="text-left">
                                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[color:var(--club-muted)]">
                                  <span className="inline-flex items-center gap-1 text-[color:var(--club-primary)]">
                                    <Newspaper className="h-3 w-3" />
                                    {catLabel}
                                  </span>
                                  <span>{new Date(item.created_at).toLocaleDateString(locale)}</span>
                                </div>
                                {item.image_url?.trim() ? (
                                  <div className="mb-3 overflow-hidden rounded-xl border border-[color:var(--club-border)]">
                                    <img src={item.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                                  </div>
                                ) : null}
                                <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{item.title}</h3>
                                <p className="mt-1 line-clamp-3 text-sm text-[color:var(--club-muted)]">{publicNewsExcerpt(item)}</p>
                                <Link
                                  to={`${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.news}/${item.id}${searchSuffix}`}
                                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--club-primary)]"
                                >
                                  {t.clubPage.homeReadMore}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </PublicClubCard>
                            );
                          })}
                        </div>
                        <div className="mt-6 text-center md:text-left">
                          <Link
                            to={newsHref}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
                          >
                            {t.clubPage.homeViewAllNews}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </PublicClubSection>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="latest_news-empty" title={t.clubPage.homeLatestNewsTitle}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintNews}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "featured_teams") {
                  if (!club.sectionVisibility.teams) return null;
                  if (featuredTeams.length > 0)
                    return (
                      <PublicClubSection key="featured_teams" title={t.clubPage.homeFeaturedTeamsTitle}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {featuredTeams.map((team) => {
                            const seg = encodePublicTeamPathSegment(team);
                            return (
                              <Link
                                key={team.id}
                                to={`${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.teams}/${seg}${searchSuffix}`}
                                className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-left no-underline transition-colors hover:border-[color:var(--club-primary)]/40"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                                    style={{ backgroundColor: "var(--club-primary)" }}
                                  >
                                    <Trophy className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-display font-semibold text-[color:var(--club-foreground)]">{team.name}</div>
                                    <div className="text-xs text-[color:var(--club-muted)]">
                                      {team.sport}
                                      {team.age_group ? ` · ${team.age_group}` : ""}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                        <div className="mt-6 flex justify-center">
                          <Button
                            asChild
                            variant="outline"
                            className={`border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-foreground)] shadow-sm ${clubCtaOutlineHoverClass}`}
                          >
                            <Link to={teamsHref}>
                              {t.clubPage.homeViewAllTeams}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </PublicClubSection>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="featured_teams-empty" title={t.clubPage.homeFeaturedTeamsTitle}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintFeaturedTeams}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "upcoming_events") {
                  if (!club.sectionVisibility.events) return null;
                  if (homeEventsPreview.length > 0)
                    return (
                      <PublicClubSection key="upcoming_events" title={t.clubPage.homeUpcomingEventsTitle}>
                        <div className="grid gap-3 md:grid-cols-3">
                          {homeEventsPreview.map((ev) => (
                            <PublicClubCard key={ev.id} padding="md" className="text-left">
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-primary)]">{ev.event_type}</div>
                              <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">{ev.title}</h3>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--club-muted)]">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                                  {new Date(ev.starts_at).toLocaleString(locale, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {ev.location ? (
                                  <span className="inline-flex min-w-0 items-start gap-1">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="line-clamp-2">{ev.location}</span>
                                  </span>
                                ) : null}
                              </div>
                            </PublicClubCard>
                          ))}
                        </div>
                        <div className="mt-6 text-center md:text-left">
                          <Link
                            to={eventsHref}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
                          >
                            {t.clubPage.homeViewAllEvents}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </PublicClubSection>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="upcoming_events-empty" title={t.clubPage.homeUpcomingEventsTitle}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintEvents}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "matches_preview") {
                  if (!club.sectionVisibility.matches) return null;
                  if (homeMatchesPreview.length > 0)
                    return (
                      <PublicClubSection key="matches_preview" title={t.clubPage.homeMatchesPreviewTitle}>
                        <div className="space-y-3">
                          {homeMatchesPreview.map((m) => {
                            const title = m.is_home ? `${club.name} vs ${m.opponent}` : `${m.opponent} vs ${club.name}`;
                            return (
                              <Link
                                key={m.id}
                                to={m.public_match_detail_enabled ? `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}/${m.id}${searchSuffix}` : matchesHref}
                                className="block rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-left no-underline transition-colors hover:border-[color:var(--club-primary)]/40"
                              >
                                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-primary)]">
                                  <Medal className="h-3.5 w-3.5" />
                                  {t.clubPage.matchesCardCompetitionFallback}
                                </div>
                                <div className="mt-1 font-display text-base font-semibold text-[color:var(--club-foreground)]">{title}</div>
                                <div className="mt-2 text-xs text-[color:var(--club-muted)]">
                                  {new Date(m.match_date).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  {m.location ? ` · ${m.location}` : ""}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                        <div className="mt-6 text-center md:text-left">
                          <Link
                            to={matchesHref}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
                          >
                            {t.clubPage.homeViewAllMatches}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </PublicClubSection>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="matches_preview-empty" title={t.clubPage.homeMatchesPreviewTitle}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintMatches}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "sponsors") {
                  if (!showPartnersStrip) {
                    if (showAdminDraftEmptyHints && club.homepageModuleDefs.sponsors.visible !== false)
                      return (
                        <PublicClubSection key="sponsors-empty" title={t.clubPage.homePartnersTitle}>
                          <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintSponsors}</PublicClubDraftEmptyHint>
                        </PublicClubSection>
                      );
                    return null;
                  }
                  return (
                    <PublicClubSection key="sponsors" title={t.clubPage.homePartnersTitle}>
                      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                        {publicPartners.map((p) => (
                          <div
                            key={p.id}
                            className="flex min-h-[3.5rem] min-w-[7rem] max-w-[10rem] flex-col items-center justify-center rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-3 py-2 text-center"
                          >
                            <Building2 className="mb-1 h-5 w-5 text-[color:var(--club-primary)]" />
                            <span className="text-xs font-semibold leading-tight text-[color:var(--club-foreground)]">{p.name}</span>
                            {p.website ? (
                              <button
                                type="button"
                                className="mt-1 text-[10px] text-[color:var(--club-primary)] underline-offset-2 hover:underline"
                                onClick={() => window.open(p.website || "", "_blank")}
                              >
                                {t.clubPage.visitWebsite}
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </PublicClubSection>
                  );
                }

                if (moduleId === "join_cta") {
                  if (showJoinCta)
                    return (
                      <PublicClubSection key="join_cta" className="border-t-0">
                        <PublicClubCard className="mx-auto max-w-2xl text-center">
                          <h2 className="font-display text-2xl font-bold text-[color:var(--club-foreground)]">{t.clubPage.homeBecomePartTitle}</h2>
                          <p className="mt-2 text-sm text-[color:var(--club-muted)]">{t.clubPage.homeBecomePartSubtitle}</p>
                          <div className="mt-6 flex justify-center">
                            <Button
                              className={`font-semibold ${clubCtaFillHoverClass}`}
                              style={{
                                backgroundColor: "var(--club-primary)",
                                color: readableTextOnSolid(club.primary_color || "#C4A052"),
                              }}
                              onClick={() => setShowRequestInvite(true)}
                            >
                              {t.clubPage.requestInvite}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </PublicClubCard>
                      </PublicClubSection>
                    );
                  return null;
                }

                if (moduleId === "gallery") {
                  if (!club.sectionVisibility.media) return null;
                  if (gallerySlice.length > 0)
                    return (
                      <PublicClubSection key="gallery" title={t.clubPage.galleryHighlight}>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {gallerySlice.map((url) => (
                            <div key={url} className="overflow-hidden rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)]">
                              <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      </PublicClubSection>
                    );
                  if (showAdminDraftEmptyHints)
                    return (
                      <PublicClubSection key="gallery-empty" title={t.clubPage.galleryHighlight}>
                        <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintGallery}</PublicClubDraftEmptyHint>
                      </PublicClubSection>
                    );
                  return null;
                }

                return null;
              })
            : null}

          {!loadingData && club.sectionVisibility.documents && publicDocumentsPreview.length > 0 ? (
            <PublicClubSection title={t.clubPage.homeDocumentsPreviewTitle}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {publicDocumentsPreview.map((d) => (
                  <li key={d.id}>
                    <PublicClubCard className="flex items-start gap-3 text-left">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--club-primary)]" />
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold text-[color:var(--club-foreground)]">{d.title}</div>
                      </div>
                    </PublicClubCard>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-center md:text-left">
                <Link
                  to={documentsHref}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--club-primary)] hover:underline"
                >
                  {t.clubPage.homeViewAllDocuments}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </PublicClubSection>
          ) : !loadingData && club.sectionVisibility.documents && showAdminDraftEmptyHints ? (
            <PublicClubSection title={t.clubPage.homeDocumentsPreviewTitle}>
              <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintDocuments}</PublicClubDraftEmptyHint>
            </PublicClubSection>
          ) : null}
        </>
      ) : null}
    </PublicClubPageGate>
  );
}
