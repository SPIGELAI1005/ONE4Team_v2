import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { PublicClubPageGate } from "@/components/public-club/public-club-page-gate";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { usePublicClub } from "@/contexts/public-club-context";
import { usePublicClubRouteSeo } from "@/contexts/public-club-route-seo-context";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import type { PublicMatchLite } from "@/lib/public-club-models";
import { publicMatchStatusBadge } from "@/lib/public-club-match-display";
import { redactMatchScoresForPrivacy } from "@/lib/public-club-privacy";

export default function PublicClubMatchDetailPage() {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const { matchId = "" } = useParams();
  const { club, basePath, searchSuffix } = usePublicClub();
  const { setExtras } = usePublicClubRouteSeo();
  const [row, setRow] = useState<PublicMatchLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayRow = useMemo(
    () => (row ? redactMatchScoresForPrivacy(row, club?.micrositePrivacy.showMatchResultsPublic ?? true) : null),
    [club?.micrositePrivacy.showMatchResultsPublic, row]
  );

  useEffect(() => {
    if (!club?.id || !matchId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from("matches")
        .select(
          "id, opponent, is_home, match_date, location, status, home_score, away_score, team_id, opponent_logo_url, public_match_detail_enabled, competitions(name)"
        )
        .eq("club_id", club.id)
        .eq("id", matchId)
        .maybeSingle();
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setRow(null);
      } else {
        setRow((data as PublicMatchLite) || null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id, matchId]);

  useEffect(() => {
    if (!club || !row || !enabled) {
      setExtras(null);
      return;
    }
    const comp = row.competitions?.name?.trim();
    const dateLine = new Date(row.match_date).toLocaleString(locale, {
      dateStyle: "long",
      timeStyle: "short",
    });
    const title = `${club.name} vs ${row.opponent}`;
    const desc = [dateLine, comp, row.location?.trim()].filter(Boolean).join(" · ");
    setExtras({ title, description: desc.slice(0, 320) });
    return () => setExtras(null);
  }, [club, enabled, locale, row, setExtras]);

  const listHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}${searchSuffix}`;
  const enabled = row?.public_match_detail_enabled === true;
  const badge = row ? publicMatchStatusBadge(row.status) : "upcoming";

  const fixtureHomeName = club && displayRow ? (displayRow.is_home ? club.name : displayRow.opponent) : "";
  const fixtureAwayName = club && displayRow ? (displayRow.is_home ? displayRow.opponent : club.name) : "";
  const fixtureHomeLogo = displayRow?.is_home ? club?.logo_url ?? null : displayRow?.opponent_logo_url ?? null;
  const fixtureAwayLogo = displayRow?.is_home ? displayRow?.opponent_logo_url ?? null : club?.logo_url ?? null;

  return (
    <PublicClubPageGate section="matches">
      <PublicClubSection>
        <div className="mx-auto max-w-lg text-left">
          <Link
            to={listHref}
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--club-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.clubPage.matchDetailBack}
          </Link>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--club-primary)]" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-sm text-[color:var(--club-muted)]">
              {error}
            </div>
          ) : !row ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-sm text-[color:var(--club-muted)]">
              {t.clubPage.matchDetailNotFound}
            </div>
          ) : !enabled ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 text-sm text-[color:var(--club-muted)]">
              {t.clubPage.matchDetailPrivate}
            </div>
          ) : displayRow ? (
            <div className="rounded-2xl border border-[color:var(--club-border)] bg-[color:var(--club-card)] p-6 shadow-sm">
              <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[color:var(--club-muted)]">
                {displayRow.competitions?.name || t.clubPage.matchDetailFixture}
              </div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  {fixtureHomeLogo ? (
                    <img src={fixtureHomeLogo} alt="" className="h-12 w-12 rounded-lg border border-[color:var(--club-border)] object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-xs font-bold text-[color:var(--club-muted)]">
                      {fixtureHomeName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-xs font-semibold leading-tight text-[color:var(--club-foreground)]">{fixtureHomeName}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[color:var(--club-muted)]">{t.clubPage.matchSideHome}</div>
                </div>
                <div className="shrink-0 px-2 text-center font-display text-2xl font-bold tabular-nums text-[color:var(--club-foreground)]">
                  {badge === "finished" && displayRow.home_score != null && displayRow.away_score != null ? (
                    <>
                      {displayRow.home_score} : {displayRow.away_score}
                    </>
                  ) : (
                    <span className="text-lg text-[color:var(--club-muted)]">vs</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  {fixtureAwayLogo ? (
                    <img src={fixtureAwayLogo} alt="" className="h-12 w-12 rounded-lg border border-[color:var(--club-border)] object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-xs font-bold text-[color:var(--club-muted)]">
                      {fixtureAwayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-xs font-semibold leading-tight text-[color:var(--club-foreground)]">{fixtureAwayName}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[color:var(--club-muted)]">{t.clubPage.matchSideAway}</div>
                </div>
              </div>
              <div className="mb-3 flex justify-center">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    badge === "live"
                      ? "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
                      : badge === "finished"
                        ? "border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-[color:var(--club-muted)]"
                        : badge === "cancelled"
                          ? "border-[color:var(--club-border)] text-[color:var(--club-muted)]"
                          : "border-[color:var(--club-primary)]/40 bg-[color:var(--club-primary)]/15 text-[color:var(--club-primary)]"
                  }`}
                >
                  {badge === "live"
                    ? t.clubPage.matchStatusLive
                    : badge === "finished"
                      ? t.clubPage.matchStatusFinished
                      : badge === "cancelled"
                        ? t.clubPage.matchStatusCancelled
                        : t.clubPage.matchStatusUpcoming}
                </span>
              </div>
              <div className="space-y-2 text-center text-sm text-[color:var(--club-muted)]">
                <div>
                  {new Date(displayRow.match_date).toLocaleString(locale, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {displayRow.location ? (
                  <div className="inline-flex items-start justify-center gap-1">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-words">{displayRow.location}</span>
                  </div>
                ) : null}
              </div>
              <p className="mt-6 text-center text-xs text-[color:var(--club-muted)]">{t.clubPage.matchDetailSafeOnly}</p>
            </div>
          ) : null}
        </div>
      </PublicClubSection>
    </PublicClubPageGate>
  );
}
