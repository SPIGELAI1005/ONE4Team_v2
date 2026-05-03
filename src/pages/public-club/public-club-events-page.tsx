import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Loader2, MapPin } from "lucide-react";
import { PublicClubDraftEmptyHint } from "@/components/public-club/public-club-draft-empty-hint";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubSectionSearchBar } from "@/components/public-club/public-club-page-shared";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { matchesSectionFilter } from "@/lib/public-club-models";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { cn } from "@/lib/utils";

function filterChip(active: boolean) {
  return cn(
    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
    active
      ? "border-[color:var(--club-primary)] bg-[color:var(--club-primary)]/15 text-[color:var(--club-foreground)]"
      : "border-[color:var(--club-border)] bg-[color:var(--club-card)] text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)]"
  );
}

function isPublicListedEvent(e: { publish_to_public_schedule?: boolean }) {
  return e.publish_to_public_schedule !== false;
}

export default function PublicClubEventsPage() {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { events, loadingData, basePath, searchSuffix, showAdminDraftEmptyHints } = usePublicClub();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>("all");

  const publicEvents = useMemo(() => events.filter(isPublicListedEvent), [events]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const e of publicEvents) {
      if (e.event_type?.trim()) s.add(e.event_type.trim());
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [publicEvents]);

  const searchFiltered = useMemo(
    () =>
      publicEvents.filter((e) =>
        matchesSectionFilter(filter, e.title, e.public_summary ?? undefined, e.event_type, e.location ?? undefined)
      ),
    [publicEvents, filter]
  );

  const categoryFiltered = useMemo(() => {
    if (category === "all") return searchFiltered;
    return searchFiltered.filter((e) => (e.event_type || "").trim() === category);
  }, [category, searchFiltered]);

  const nowMs = Date.now();

  const upcoming = useMemo(
    () =>
      [...categoryFiltered]
        .filter((e) => new Date(e.starts_at).getTime() >= nowMs - 6 * 3600000)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [categoryFiltered, nowMs]
  );

  const past = useMemo(
    () =>
      [...categoryFiltered]
        .filter((e) => new Date(e.starts_at).getTime() < nowMs - 6 * 3600000)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    [categoryFiltered, nowMs]
  );

  const joinHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.join}${searchSuffix}`;

  const renderEventCard = (event: (typeof publicEvents)[0], variant: "upcoming" | "past") => {
    const summary = (event.public_summary ?? "").trim();
    const regEnabled = event.public_registration_enabled === true;
    const isFuture = new Date(event.starts_at).getTime() > Date.now();
    const regStatus = regEnabled && isFuture ? t.clubPage.eventsRegOpen : regEnabled ? t.clubPage.eventsRegClosed : t.clubPage.eventsRegNone;
    const detailHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.events}/${event.id}${searchSuffix}`;
    const showLearnMore = event.public_event_detail_enabled === true;
    const showRegisterExternal = regEnabled && isFuture && Boolean(event.registration_external_url?.trim());
    const showRegisterClub = regEnabled && isFuture && !event.registration_external_url?.trim();

    return (
      <div
        key={`${variant}-${event.id}`}
        className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] text-left shadow-sm"
      >
        {event.image_url?.trim() ? (
          <div className="border-b border-[color:var(--club-border)]">
            <img src={event.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-[color:var(--club-primary)]/15 px-2.5 py-1 text-xs font-medium capitalize text-[color:var(--club-primary)]">
              {event.event_type}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--club-muted)]">{regStatus}</span>
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight text-[color:var(--club-foreground)]">{event.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--club-muted)]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {new Date(event.starts_at).toLocaleString(locale, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {event.location ? (
              <span className="inline-flex min-w-0 items-start gap-1">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{event.location}</span>
              </span>
            ) : null}
          </div>
          {summary ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color:var(--club-muted)]">{summary}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {showLearnMore ? (
              <Link
                to={detailHref}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[color:var(--club-border)] px-4 text-xs font-semibold text-[color:var(--club-foreground)] hover:bg-[color:var(--club-tertiary)]"
              >
                {t.clubPage.eventsCtaLearnMore}
              </Link>
            ) : null}
            {showRegisterExternal ? (
              <a
                href={event.registration_external_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-xs font-semibold text-white hover:brightness-110"
                style={{ backgroundColor: "var(--club-primary)" }}
              >
                {t.clubPage.eventsCtaRegister}
              </a>
            ) : null}
            {showRegisterClub ? (
              <Link
                to={joinHref}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-xs font-semibold text-white hover:brightness-110"
                style={{ backgroundColor: "var(--club-primary)" }}
              >
                {t.clubPage.eventsCtaRegisterClub}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PublicClubPageGate section="events">
      <PublicClubSection
        title={
          <>
            {t.clubPage.eventsPageTitle}{" "}
            <span className="text-[color:var(--club-primary)]">{t.clubPage.eventsPageHighlight}</span>
          </>
        }
        subtitle={<span className="text-[color:var(--club-muted)]">{t.clubPage.eventsPageSubtitle}</span>}
      >
        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : publicEvents.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-8 text-center">
            <div className="text-sm font-medium text-[color:var(--club-foreground)]">{t.clubPage.eventsEmptyDedicated}</div>
            {showAdminDraftEmptyHints ? (
              <div className="mt-4 text-left">
                <PublicClubDraftEmptyHint>{t.clubPage.draftEmptyHintEvents}</PublicClubDraftEmptyHint>
              </div>
            ) : (
              <div className="mt-1 text-xs text-[color:var(--club-muted)]">{t.clubPage.eventsWillAppear}</div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={filterChip(category === "all")} onClick={() => setCategory("all")}>
                {t.clubPage.eventsCategoryAll}
              </button>
              {categories.map((c) => (
                <button key={c} type="button" className={filterChip(category === c)} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
            <PublicClubSectionSearchBar
              id="public-club-events-search"
              value={filter}
              onChange={setFilter}
              placeholder={t.clubPage.sectionSearchEvents}
            />
            {!categoryFiltered.length ? (
              <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-center text-sm text-[color:var(--club-muted)]">
                {t.clubPage.noSearchResults}
              </div>
            ) : (
              <>
                <div>
                  <h3 className="mb-3 font-display text-lg font-bold text-[color:var(--club-foreground)]">{t.clubPage.eventsUpcomingTitle}</h3>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.eventsUpcomingEmpty}</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">{upcoming.map((e) => renderEventCard(e, "upcoming"))}</div>
                  )}
                </div>
                <div>
                  <h3 className="mb-3 font-display text-lg font-bold text-[color:var(--club-foreground)]">{t.clubPage.eventsPastTitle}</h3>
                  {past.length === 0 ? (
                    <p className="text-sm text-[color:var(--club-muted)]">{t.clubPage.eventsPastEmpty}</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">{past.map((e) => renderEventCard(e, "past"))}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
