import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { PublicClubSection } from "@/components/public-club/public-club-section";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { PublicClubButton } from "@/components/public-club/public-club-button";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";
import { mergePublicMatchLists, publicMatchHeadline } from "@/lib/public-club-match-display";

/** Homepage teaser for live scores — links to matches when games are in progress. */
export function PublicClubLiveScoresSection() {
  const { t } = useLanguage();
  const { club, user, teams, publicMatches, publicMatchesUpcoming, liveScoresCta, basePath, searchSuffix } = usePublicClub();

  const liveMatches = useMemo(() => {
    return mergePublicMatchLists(publicMatches, publicMatchesUpcoming).filter(
      (m) => m.status === "in_progress" && m.publish_to_public_schedule !== false,
    );
  }, [publicMatches, publicMatchesUpcoming]);

  if (!club?.sectionVisibility.livescores) return null;

  const matchesHref = `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}${searchSuffix}`;

  return (
    <PublicClubSection title={t.clubPage.liveScoresPublicTitle}>
      <PublicClubCard className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/10">
          <Radio className="h-8 w-8 text-[color:var(--club-primary)]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-display text-base font-semibold text-[color:var(--club-foreground)]">
            {t.clubPage.liveScoresTitle}
          </h3>
          <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.clubPage.liveScoresPublicDesc}</p>
          {liveMatches.length === 0 ? (
            <p className="text-sm leading-relaxed text-[color:var(--club-muted)]">{t.clubPage.liveScoresNoLive}</p>
          ) : (
            <ul className="space-y-2 pt-1">
              {liveMatches.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <Link
                    to={`${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.matches}/${m.id}${searchSuffix}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--club-border)]/60 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    <span className="truncate font-medium text-[color:var(--club-foreground)]">
                      {publicMatchHeadline(m, teams, club.name)}
                    </span>
                    <span className="shrink-0 font-display font-bold text-[color:var(--club-primary)]">
                      {m.home_score ?? 0}:{m.away_score ?? 0}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {liveMatches.length > 0 ? (
            <Link
              to={matchesHref}
              className="inline-block text-xs font-semibold text-[color:var(--club-primary)] hover:underline"
            >
              {t.clubPage.liveScoresViewMatches}
            </Link>
          ) : null}
        </div>
        <PublicClubButton appearance="primary" className="w-full shrink-0 sm:w-auto" onClick={liveScoresCta}>
          {user ? t.clubPage.liveScoresCtaSignedIn : t.clubPage.liveScoresCtaSignedOut}
        </PublicClubButton>
      </PublicClubCard>
    </PublicClubSection>
  );
}
