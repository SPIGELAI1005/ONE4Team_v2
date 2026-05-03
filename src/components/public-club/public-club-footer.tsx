import { Link } from "react-router-dom";
import type { PublicClubRecord } from "@/lib/public-club-models";
import logo from "@/assets/one4team-logo.png";
import { useLanguage } from "@/hooks/use-language";
import { usePublicClub } from "@/contexts/public-club-context";
import { PUBLIC_CLUB_ROUTE_SEGMENTS } from "@/lib/public-club-routes";

export function PublicClubFooter({ club }: { club: PublicClubRecord | null }) {
  const { t } = useLanguage();
  const { basePath, searchSuffix } = usePublicClub();
  const v = club?.sectionVisibility;

  const links: { to: string; label: string }[] = [];
  if (v?.news) links.push({ to: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.news}`, label: t.clubPage.newsSection });
  if (v?.teams) links.push({ to: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.teams}`, label: t.clubPage.teamsSection });
  if (v?.schedule) links.push({ to: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.schedule}`, label: t.clubPage.scheduleSection });
  if (v?.contact) links.push({ to: `${basePath}/${PUBLIC_CLUB_ROUTE_SEGMENTS.contact}`, label: t.clubPage.contactSection });

  return (
    <footer className="mt-auto border-t border-[color:var(--club-border)] py-8">
      <div className="mx-auto w-full max-w-lg px-4 text-center sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        <div className="mb-3 flex items-center justify-center gap-2">
          <img src={club?.logo_url || logo} alt="" className="h-6 w-6 rounded-md object-cover" />
          <span className="font-display text-sm font-bold text-[color:var(--club-foreground)]">{club?.name || t.common.club}</span>
        </div>
        {links.length ? (
          <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--club-muted)]">
            {links.map((l) => (
              <Link key={l.to} to={`${l.to}${searchSuffix}`} className="hover:text-[color:var(--club-foreground)]">
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <p className="text-xs text-[color:var(--club-muted)]">{t.clubPage.poweredBy}</p>
      </div>
    </footer>
  );
}
