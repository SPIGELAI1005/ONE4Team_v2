import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Medal,
  Newspaper,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { EmptyPublicState } from "@/components/public-club/empty-public-state";
import { publicClubSectionContainer } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { decodePublicTeamPathSegment } from "@/lib/public-club-team-slug";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { publicNewsExcerpt } from "@/lib/public-club-news";
import type { NewsRowLite } from "@/lib/public-club-models";

interface PublicTeamPayloadTeam {
  id: string;
  name: string;
  sport: string | null;
  age_group: string | null;
  league: string | null;
  coach_name: string | null;
  public_description?: string | null;
  has_public_coach_contact?: boolean;
}

interface PublicCoachEntry {
  name: string;
  contact_email: string | null;
}

interface PublicTrainingEntry {
  source: string;
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
}

interface PublicMatchEntry {
  id: string;
  opponent: string;
  is_home: boolean;
  match_date: string;
  location: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface PublicTeamNewsItem {
  id: string;
  title: string;
  created_at: string;
  excerpt: string | null;
  image_url: string | null;
}

interface PublicTeamDoc {
  title?: string;
  url?: string;
}

interface PublicTeamStats {
  registered_players?: number;
  public_coaches?: number;
  upcoming_trainings?: number;
}

interface PublicTeamPayload {
  team: PublicTeamPayloadTeam;
  coaches: PublicCoachEntry[];
  trainings: PublicTrainingEntry[];
  matches: PublicMatchEntry[];
  next_match: PublicMatchEntry | null;
  news: PublicTeamNewsItem[];
  documents: PublicTeamDoc[];
  stats: PublicTeamStats | null;
}

function formatSessionRange(startsAt: string, endsAt: string | null, locale: string) {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const d = start.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  const t0 = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (!end || Number.isNaN(end.getTime())) return `${d} · ${t0}`;
  const t1 = end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${d} · ${t0}–${t1}`;
}

function normalizeDocuments(raw: unknown): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { title: string; url: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    const url = String(o.url ?? "").trim();
    if (title && url) out.push({ title, url });
  }
  return out;
}

export default function PublicClubTeamDetailPage() {
  const { teamSlug } = useParams();
  const { t, language } = useLanguage();
  const ct = t.clubTeamPage;
  const cp = t.clubPage;
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { club, clubSlug, basePath, searchSuffix, setShowRequestInvite } = usePublicClub();
  const { setExtras } = usePublicClubRouteSeo();
  const teamId = decodePublicTeamPathSegment(teamSlug);
  const teamsHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.teams}${searchSuffix}`;
  const contactHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.contact}${searchSuffix}`;

  const [payload, setPayload] = useState<PublicTeamPayload | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    if (!clubSlug || !teamId || !club) return;
    let cancelled = false;
    setTeamLoading(true);
    void supabase
      .rpc("get_public_club_team_page", { _club_slug: clubSlug, _team_id: teamId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || typeof data !== "object") {
          setPayload(null);
          return;
        }
        const raw = data as Record<string, unknown>;
        const newsRaw = Array.isArray(raw.news) ? raw.news : [];
        const news: PublicTeamNewsItem[] = newsRaw
          .filter((n): n is Record<string, unknown> => Boolean(n && typeof n === "object"))
          .map((n) => ({
            id: String(n.id ?? ""),
            title: String(n.title ?? ""),
            created_at: String(n.created_at ?? ""),
            excerpt: (n.excerpt as string | null) ?? null,
            image_url: (n.image_url as string | null) ?? null,
          }))
          .filter((n) => n.id && n.title);

        const docs = normalizeDocuments(raw.documents);
        const stats = raw.stats && typeof raw.stats === "object" ? (raw.stats as PublicTeamStats) : null;

        setPayload({
          team: raw.team as unknown as PublicTeamPayloadTeam,
          coaches: Array.isArray(raw.coaches) ? (raw.coaches as PublicCoachEntry[]) : [],
          trainings: Array.isArray(raw.trainings) ? (raw.trainings as PublicTrainingEntry[]) : [],
          matches: Array.isArray(raw.matches) ? (raw.matches as PublicMatchEntry[]) : [],
          next_match: raw.next_match && typeof raw.next_match === "object" ? (raw.next_match as PublicMatchEntry) : null,
          news,
          documents: docs,
          stats,
        });
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [club, clubSlug, teamId]);

  useEffect(() => {
    if (!club || !payload?.team?.name) {
      setExtras(null);
      return;
    }
    const desc = (payload.team.public_description ?? "").trim() || null;
    setExtras({ title: payload.team.name, description: desc });
    return () => setExtras(null);
  }, [club, payload?.team.name, payload?.team.public_description, setExtras]);

  const primaryCoachMail = useMemo(() => {
    if (!payload?.coaches?.length) return null;
    const withMail = payload.coaches.find((c) => c.contact_email?.trim());
    return withMail?.contact_email?.trim() ?? null;
  }, [payload?.coaches]);

  const newsAsRowLite = useMemo((): NewsRowLite[] => {
    if (!payload?.news?.length) return [];
    return payload.news.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.excerpt ?? "",
      created_at: n.created_at,
      priority: null,
      excerpt: n.excerpt,
      image_url: n.image_url,
    }));
  }, [payload?.news]);

  const matchesWithoutNext = useMemo(() => {
    if (!payload?.matches?.length) return [];
    const nid = payload.next_match?.id;
    if (!nid) return payload.matches;
    return payload.matches.filter((m) => m.id !== nid);
  }, [payload?.matches, payload?.next_match?.id]);

  if (!teamId) {
    return (
      <PublicClubPageGate section="teams">
        <EmptyPublicState title={ct.notFound} description={ct.privateClubHint} homeTo={`${basePath}${searchSuffix}`} />
      </PublicClubPageGate>
    );
  }

  return (
    <PublicClubPageGate section="teams">
      <div className={`${publicClubSectionContainer} py-6 pb-16`}>
        <div className="mb-6">
          <Button asChild variant="outline" size="sm" className="border-[color:var(--club-border)] text-[color:var(--club-foreground)]">
            <Link to={teamsHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {ct.backToTeams}
            </Link>
          </Button>
        </div>

        {teamLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-[color:var(--club-primary)]" />
          </div>
        ) : !payload ? (
          <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-8 text-center text-sm text-[color:var(--club-muted)]">
            {ct.notFound}
            <div className="mt-2 text-xs opacity-80">{ct.privateClubHint}</div>
          </div>
        ) : (
          <div className="space-y-10">
            <section className="overflow-hidden rounded-3xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] text-left shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
              <div className="relative min-h-[200px] bg-gradient-to-br from-[color:var(--club-primary)]/35 via-[color:var(--club-card)] to-[color:var(--club-border)]/50 px-6 py-10 sm:px-10 sm:py-12">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white sm:h-16 sm:w-16"
                      style={{ backgroundColor: "var(--club-primary)" }}
                    >
                      <Trophy className="h-8 w-8 sm:h-9 sm:w-9" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-4xl">{payload.team.name}</h1>
                      <p className="mt-2 text-sm text-white/85">
                        {[payload.team.sport, payload.team.age_group, payload.team.league].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <Button
                      type="button"
                      className="rounded-full bg-[color:var(--club-primary)] text-white hover:brightness-110"
                      onClick={() => setShowRequestInvite(true)}
                    >
                      {ct.joinThisTeam}
                    </Button>
                    {primaryCoachMail ? (
                      <Button asChild variant="secondary" className="rounded-full border-white/20 bg-white/15 text-white hover:bg-white/25">
                        <a href={`mailto:${primaryCoachMail}`}>
                          <Mail className="mr-2 h-4 w-4" />
                          {ct.contactCoach}
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" className="rounded-full border-white/20 bg-white/15 text-white hover:bg-white/25">
                        <Link to={contactHref}>
                          <Mail className="mr-2 h-4 w-4" />
                          {ct.contactClubInstead}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {payload.team.public_description?.trim() ? (
                <div className="border-t border-[color:var(--club-border)] px-6 py-5 text-sm leading-relaxed text-[color:var(--club-muted)] sm:px-10">
                  {payload.team.public_description.trim()}
                </div>
              ) : null}
            </section>

            <div className="flex flex-col gap-3 sm:hidden">
              <Button
                type="button"
                className="w-full rounded-full bg-[color:var(--club-primary)] text-white"
                onClick={() => setShowRequestInvite(true)}
              >
                {ct.joinThisTeam}
              </Button>
              {primaryCoachMail ? (
                <Button asChild variant="outline" className="w-full rounded-full border-[color:var(--club-border)]">
                  <a href={`mailto:${primaryCoachMail}`}>{ct.contactCoach}</a>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full rounded-full border-[color:var(--club-border)]">
                  <Link to={contactHref}>{ct.contactClubInstead}</Link>
                </Button>
              )}
            </div>

            <section className="space-y-3 text-left">
              <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                <Calendar className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                {ct.trainingTitle}
              </h2>
              {payload.trainings.length === 0 ? (
                <p className="text-sm text-[color:var(--club-muted)]">{ct.noTrainings}</p>
              ) : (
                <ul className="space-y-2">
                  {payload.trainings.map((tr) => (
                    <li key={`${tr.source}-${tr.id}`} className="rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-4 py-3">
                      <div className="font-medium text-[color:var(--club-foreground)]">{tr.title}</div>
                      <div className="mt-1 flex flex-col gap-1 text-xs text-[color:var(--club-muted)] sm:flex-row sm:flex-wrap sm:gap-x-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatSessionRange(tr.starts_at, tr.ends_at, locale)}
                        </span>
                        {tr.location ? (
                          <span className="inline-flex items-start gap-1">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            {tr.location}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {payload.coaches.length ? (
              <section className="space-y-3 text-left">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                  <Users className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                  {ct.coachingStaff}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {payload.coaches.map((c) => (
                    <li
                      key={`${c.name}-${c.contact_email ?? ""}`}
                      className="rounded-full border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-3 py-1.5 text-sm text-[color:var(--club-foreground)]"
                    >
                      {c.name}
                      {c.contact_email?.trim() ? (
                        <a className="ml-2 text-xs text-[color:var(--club-primary)] hover:underline" href={`mailto:${c.contact_email.trim()}`}>
                          {ct.emailShort}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payload.next_match ? (
              <section className="space-y-3 text-left">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                  <Medal className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                  {ct.nextMatchTitle}
                </h2>
                <div className="rounded-2xl border border-[color:var(--club-primary)]/30 bg-[color:var(--club-card)] p-4">
                  <div className="font-medium text-[color:var(--club-foreground)]">
                    {payload.next_match.is_home ? `${payload.team.name} vs ${payload.next_match.opponent}` : `${payload.next_match.opponent} vs ${payload.team.name}`}
                    <span className="ml-2 text-xs font-normal text-[color:var(--club-muted)]">
                      ({payload.next_match.is_home ? ct.home : ct.away})
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--club-muted)]">
                    {new Date(payload.next_match.match_date).toLocaleDateString(locale, {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {payload.next_match.location ? ` · ${payload.next_match.location}` : ""}
                  </div>
                </div>
              </section>
            ) : null}

            {matchesWithoutNext.length ? (
              <section className="space-y-3 text-left">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                  <Medal className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                  {ct.upcomingMatchesTitle}
                </h2>
                <ul className="space-y-2">
                  {matchesWithoutNext.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-4 py-3"
                    >
                      <div>
                        <div className="font-medium text-[color:var(--club-foreground)]">
                          {m.is_home ? `${payload.team.name} vs ${m.opponent}` : `${m.opponent} vs ${payload.team.name}`}
                          <span className="ml-2 text-xs font-normal text-[color:var(--club-muted)]">({m.is_home ? ct.home : ct.away})</span>
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--club-muted)]">
                          {new Date(m.match_date).toLocaleDateString(locale, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          {m.location ? ` · ${m.location}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums text-[color:var(--club-foreground)]">
                        {m.home_score != null && m.away_score != null ? `${m.home_score} : ${m.away_score}` : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : !payload.next_match ? (
              <section className="text-left">
                <h2 className="font-display mb-2 flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                  <Medal className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                  {ct.matchTitle}
                </h2>
                <p className="text-sm text-[color:var(--club-muted)]">{ct.noMatches}</p>
              </section>
            ) : null}

            {payload.news.length ? (
              <section className="space-y-3 text-left">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                  <Newspaper className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                  {ct.teamNewsTitle}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {newsAsRowLite.map((row) => (
                    <li key={row.id} className="rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4">
                      <div className="text-[10px] text-[color:var(--club-muted)]">{new Date(row.created_at).toLocaleDateString(locale)}</div>
                      <div className="mt-1 font-medium text-[color:var(--club-foreground)]">{row.title}</div>
                      <p className="mt-1 line-clamp-3 text-xs text-[color:var(--club-muted)]">{publicNewsExcerpt(row)}</p>
                      <Link
                        to={`${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.news}/${row.id}${searchSuffix}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--club-primary)]"
                      >
                        {cp.newsReadMore}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payload.documents.length ? (
              <section className="space-y-3 text-left">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-[color:var(--club-foreground)]">
                  <FileText className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
                  {ct.teamDocumentsTitle}
                </h2>
                <ul className="space-y-2">
                  {payload.documents.map((doc, i) => (
                    <li key={`${doc.url}-${i}`}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] px-4 py-3 text-sm font-medium text-[color:var(--club-primary)] hover:bg-[color:var(--club-card)]/80"
                      >
                        <span className="truncate text-[color:var(--club-foreground)]">{doc.title}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payload.stats ? (
              <section className="space-y-3 text-left">
                <h2 className="font-display text-lg font-semibold text-[color:var(--club-foreground)]">{ct.teamOverviewTitle}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center">
                    <Users className="mx-auto mb-2 h-5 w-5 text-[color:var(--club-primary)]" />
                    <div className="text-2xl font-bold tabular-nums text-[color:var(--club-foreground)]">{payload.stats.registered_players ?? 0}</div>
                    <div className="text-[11px] text-[color:var(--club-muted)]">{ct.statPlayersRegistered}</div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center">
                    <Trophy className="mx-auto mb-2 h-5 w-5 text-[color:var(--club-primary)]" />
                    <div className="text-2xl font-bold tabular-nums text-[color:var(--club-foreground)]">{payload.stats.public_coaches ?? 0}</div>
                    <div className="text-[11px] text-[color:var(--club-muted)]">{ct.statPublicCoaches}</div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-4 text-center sm:col-span-2">
                    <Calendar className="mx-auto mb-2 h-5 w-5 text-[color:var(--club-primary)]" />
                    <div className="text-2xl font-bold tabular-nums text-[color:var(--club-foreground)]">{payload.stats.upcoming_trainings ?? 0}</div>
                    <div className="text-[11px] text-[color:var(--club-muted)]">{ct.statUpcomingSessions}</div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </PublicClubPageGate>
  );
}
