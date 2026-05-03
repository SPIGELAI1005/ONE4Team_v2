import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, Medal, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { useActiveClub } from "@/hooks/use-active-club";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import {
  getClubPageDraftConfig,
  mergeClubRowWithPublicPageConfig,
  mergeRowWithEffectivePublished,
} from "@/lib/club-public-page-config";
import logo from "@/assets/one4team-logo.png";

const TEAM_PAGE_CLUB_SELECT =
  "id, name, slug, description, is_public, logo_url, primary_color, secondary_color, tertiary_color, support_color, public_page_published_config";

type ClubTheme = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  support_color: string | null;
};

interface PublicTeamPayload {
  team: {
    id: string;
    name: string;
    sport: string | null;
    age_group: string | null;
    league: string | null;
    coach_name: string | null;
  };
  coaches: { name: string }[];
  players: { display_name: string | null; jersey_number: number | null }[];
  trainings: {
    source: string;
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
  }[];
  matches: {
    id: string;
    opponent: string;
    is_home: boolean;
    match_date: string;
    location: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
  }[];
}

function mapClubTheme(record: Record<string, unknown>): ClubTheme {
  return {
    id: String(record.id),
    name: String(record.name),
    slug: String(record.slug),
    description: (record.description as string | null) ?? null,
    is_public: record.is_public !== false,
    logo_url: (record.logo_url as string | null) ?? null,
    primary_color: (record.primary_color as string | null) ?? null,
    secondary_color: (record.secondary_color as string | null) ?? null,
    tertiary_color: (record.tertiary_color as string | null) ?? null,
    support_color: (record.support_color as string | null) ?? null,
  };
}

const clubSectionContainer =
  "w-full max-w-lg sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 text-center md:text-left";

function formatSessionRange(startsAt: string, endsAt: string | null, locale: string) {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const d = start.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  const t0 = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (!end || Number.isNaN(end.getTime())) return `${d} · ${t0}`;
  const t1 = end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${d} · ${t0}–${t1}`;
}

export default function ClubTeamPage() {
  const { clubSlug, teamId } = useParams();
  const { search: locationSearch } = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeClubId, activeClub } = useActiveClub();
  const { t, language } = useLanguage();
  const ct = t.clubTeamPage;
  const locale = language === "de" ? "de-DE" : "en-GB";

  const isPreviewMode = searchParams.get("preview") === "1";
  const isDraftPreviewMode = searchParams.get("draft") === "1";
  const backHref = `/club/${clubSlug ?? ""}${locationSearch || ""}`;

  const [club, setClub] = useState<ClubTheme | null>(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [payload, setPayload] = useState<PublicTeamPayload | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const loadClub = useCallback(async () => {
    if (!clubSlug) return;
    setClubLoading(true);
    const first = await supabase.from("clubs").select(TEAM_PAGE_CLUB_SELECT).eq("slug", clubSlug).maybeSingle();
    let record = first.data ? mergeRowWithEffectivePublished(first.data as unknown as Record<string, unknown>) : null;
    let loadError = first.error;

    if (!loadError && !record && isPreviewMode && user && activeClubId && activeClub?.slug === clubSlug) {
      const second = await supabase.from("clubs").select(TEAM_PAGE_CLUB_SELECT).eq("id", activeClubId).maybeSingle();
      loadError = second.error;
      record = second.data ? mergeRowWithEffectivePublished(second.data as unknown as Record<string, unknown>) : null;
    }

    if (!loadError && record) {
      let display = mergeRowWithEffectivePublished(record);
      if (isDraftPreviewMode && user) {
        const { data: isAdmin } = await supabase.rpc("is_club_admin", {
          _club_id: String(display.id),
          _user_id: user.id,
        });
        if (isAdmin) {
          const { data: draftConfig } = await getClubPageDraftConfig(supabase, String(display.id));
          if (draftConfig) display = mergeClubRowWithPublicPageConfig(display, draftConfig);
        }
      }
      setClub(mapClubTheme(display));
    } else setClub(null);
    setClubLoading(false);
  }, [activeClub?.slug, activeClubId, clubSlug, isDraftPreviewMode, isPreviewMode, user]);

  useEffect(() => {
    void loadClub();
  }, [loadClub]);

  useEffect(() => {
    if (!clubSlug || !teamId || clubLoading || !club) return;
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
        setPayload(data as unknown as PublicTeamPayload);
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [club, clubLoading, clubSlug, teamId]);

  useEffect(() => {
    if (!club) return;
    const prev = document.title;
    document.title = `${payload?.team.name ?? club.name} · ${club.name}`;
    return () => {
      document.title = prev;
    };
  }, [club, payload?.team.name]);

  const themeStyle = useMemo(
    () =>
      ({
        "--club-primary": club?.primary_color || "#C4A052",
        "--club-secondary": club?.secondary_color || "#1E293B",
        "--club-tertiary": club?.tertiary_color || "#0F172A",
        "--club-support": club?.support_color || "#22C55E",
      }) as CSSProperties,
    [club]
  );

  if (clubLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center">{t.clubPage.clubNotFound}</p>
        <Button asChild variant="outline">
          <Link to="/">{t.clubPage.goHome}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]" style={themeStyle}>
      <AppHeader
        variant="clubPublic"
        title={payload?.team.name ?? club.name}
        subtitle={
          payload?.team
            ? [payload.team.sport, payload.team.age_group].filter(Boolean).join(" · ") || club.description || undefined
            : club.description || undefined
        }
        back={false}
        titleLeading={
          <img src={club.logo_url || logo} alt="" className="w-7 h-7 shrink-0 rounded-md object-cover" />
        }
        rightSlot={
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={backHref}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              {ct.backToClub}
            </Link>
          </Button>
        }
      />

      {isPreviewMode ? (
        <div className="border-b border-primary/20 bg-primary/10">
          <div className={`${clubSectionContainer} py-2 text-xs text-primary font-medium`}>
            {t.clubPage.previewMode} · {t.clubPage.previewModeDesc}
          </div>
        </div>
      ) : null}

      <div className={`${clubSectionContainer} py-6 space-y-8`}>
        <div className="md:hidden">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={backHref}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {ct.backToClub}
            </Link>
          </Button>
        </div>

        {teamLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--club-primary)" }} />
          </div>
        ) : !payload ? (
          <div className="rounded-2xl border border-border/70 bg-card/50 p-8 text-center text-muted-foreground text-sm">
            {ct.notFound}
            <div className="mt-2 text-xs opacity-80">{ct.privateClubHint}</div>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-border/70 bg-card/40 p-5 sm:p-6 text-left">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: "var(--club-primary)" }}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{payload.team.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[payload.team.sport, payload.team.age_group, payload.team.league].filter(Boolean).join(" · ")}
                  </p>
                  {payload.team.coach_name ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium text-foreground/90">{t.clubPage.coach}:</span> {payload.team.coach_name}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="text-left space-y-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
                {ct.coachingStaff}
              </h2>
              {payload.coaches.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ct.noCoaches}</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {payload.coaches.map((c) => (
                    <li key={c.name} className="text-sm px-3 py-1.5 rounded-full border border-border/80 bg-background/60">
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="text-left space-y-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
                {ct.squad}
              </h2>
              {payload.players.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ct.noPlayers}</p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-2">
                  {payload.players.map((p, i) => (
                    <li key={`${p.display_name ?? "p"}-${i}`} className="text-sm rounded-xl border border-border/70 px-3 py-2 bg-card/50 flex justify-between gap-2">
                      <span className="font-medium text-foreground truncate">{p.display_name?.trim() || t.common.unknown}</span>
                      {p.jersey_number != null ? (
                        <span className="text-muted-foreground tabular-nums shrink-0">#{p.jersey_number}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="text-left space-y-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
                {ct.trainingTitle}
              </h2>
              {payload.trainings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ct.noTrainings}</p>
              ) : (
                <ul className="space-y-2">
                  {payload.trainings.map((tr) => (
                    <li key={`${tr.source}-${tr.id}`} className="rounded-xl border border-border/70 px-4 py-3 bg-card/50">
                      <div className="font-medium text-foreground">{tr.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-x-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {formatSessionRange(tr.starts_at, tr.ends_at, locale)}
                        </span>
                        {tr.location ? (
                          <span className="inline-flex items-start gap-1">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            {tr.location}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="text-left space-y-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Medal className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
                {ct.matchTitle}
              </h2>
              {payload.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ct.noMatches}</p>
              ) : (
                <ul className="space-y-2">
                  {payload.matches.map((m) => (
                    <li key={m.id} className="rounded-xl border border-border/70 px-4 py-3 bg-card/50 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground">
                          {m.is_home ? `${payload.team.name} vs ${m.opponent}` : `${m.opponent} vs ${payload.team.name}`}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">({m.is_home ? ct.home : ct.away})</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(m.match_date).toLocaleDateString(locale, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          {m.location ? ` · ${m.location}` : ""}
                        </div>
                      </div>
                      <div className="text-sm tabular-nums font-semibold">
                        {m.home_score != null && m.away_score != null ? `${m.home_score} : ${m.away_score}` : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
