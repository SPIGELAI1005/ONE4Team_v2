import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Trophy, Calendar, MoreHorizontal, Newspaper } from "lucide-react";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getEnabledPublicPages, publicNavIdToPathSegment } from "@/lib/public-page-flex-config";
import type { PublicMicroPageId } from "@/lib/club-page-settings-helpers";
import logo from "@/assets/one4team-logo.png";

function navClass(active: boolean) {
  return [
    "text-sm font-medium transition-colors rounded-full px-3 py-2",
    active
      ? "text-[color:var(--club-foreground)] bg-white/10"
      : "text-[color:var(--club-muted)] hover:text-[color:var(--club-foreground)] hover:bg-white/5",
  ].join(" ");
}

function defaultNavLabel(id: PublicMicroPageId, t: { clubPage: typeof import("@/i18n/en").en.clubPage; common: { home: string } }): string {
  const p = t.clubPage;
  switch (id) {
    case "home":
      return t.common.home;
    case "news":
      return p.newsSection;
    case "teams":
      return p.teamsSection;
    case "schedule":
      return p.scheduleSection;
    case "matches":
      return p.matchesSection;
    case "events":
      return p.eventsSection;
    case "documents":
      return p.documentsSection;
    case "join":
      return p.joinNav;
    case "contact":
      return p.contactSection;
    default:
      return id;
  }
}

function iconForNavId(id: PublicMicroPageId): LucideIcon {
  if (id === "teams") return Trophy;
  if (id === "schedule") return Calendar;
  if (id === "news") return Newspaper;
  return LayoutDashboard;
}

export function PublicClubNavbar() {
  const { t } = useLanguage();
  const { club, basePath, searchSuffix, openDashboardOrAuth, checkingMembership } = usePublicClub();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const desktopItems = useMemo(() => {
    if (!club) return [];
    return getEnabledPublicPages(club.publicPageLayout).map((e) => {
      const seg = publicNavIdToPathSegment(e.id);
      const to = e.id === "home" ? basePath : `${basePath}/${seg}`;
      const label = e.navLabel.trim() || defaultNavLabel(e.id, t);
      return { to, label, id: e.id };
    });
  }, [basePath, club, t]);

  const mobileNavSplit = useMemo(() => {
    if (!club) return { primary: [] as { to: string; label: string; icon: LucideIcon }[], more: [] as { to: string; label: string }[] };
    const entries = getEnabledPublicPages(club.publicPageLayout);
    const home = entries.find((e) => e.id === "home");
    const rest = entries.filter((e) => e.id !== "home");
    const primaryEntries = [home, ...rest.slice(0, 2)].filter(Boolean) as typeof entries;
    const moreEntries = rest.slice(2);
    const primary = primaryEntries.map((e) => {
      const seg = publicNavIdToPathSegment(e.id);
      const to = e.id === "home" ? basePath : `${basePath}/${seg}`;
      const label = e.navLabel.trim() || defaultNavLabel(e.id, t);
      return { to, label, icon: iconForNavId(e.id) };
    });
    const more = moreEntries.map((e) => {
      const seg = publicNavIdToPathSegment(e.id);
      const to = `${basePath}/${seg}`;
      const label = e.navLabel.trim() || defaultNavLabel(e.id, t);
      return { to, label };
    });
    return { primary, more };
  }, [basePath, club, t]);

  if (!club) return null;

  const isActivePath = (to: string) => {
    if (to === basePath) return location.pathname === basePath || location.pathname === `${basePath}/`;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--club-border)] bg-[color:var(--club-tertiary)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to={`${basePath}${searchSuffix}`} className="flex min-w-0 items-center gap-2 shrink-0">
          <img
            src={club.logo_url || logo}
            alt={t.clubPage.clubLogoAlt.replace("{name}", club.name)}
            className="h-9 w-9 rounded-lg object-cover border border-[color:var(--club-border)]"
          />
          <span className="font-display font-bold text-[color:var(--club-foreground)] truncate max-w-[10rem] sm:max-w-[14rem]">
            {club.name}
          </span>
        </Link>

        <nav className="hidden lg:flex flex-1 flex-wrap items-center justify-center gap-1">
          {desktopItems.map((item) => (
            <NavLink
              key={item.to}
              to={`${item.to}${searchSuffix}`}
              end={item.to === basePath}
              className={({ isActive }) => navClass(isActive || isActivePath(item.to))}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 justify-end gap-2 lg:flex-none">
          <Button
            size="sm"
            className="hidden lg:inline-flex font-semibold text-white hover:brightness-110 shrink-0"
            style={{ backgroundColor: "var(--club-primary)" }}
            onClick={openDashboardOrAuth}
            disabled={checkingMembership}
          >
            <LayoutDashboard className="w-4 h-4 mr-1" />
            {t.clubPage.openDashboard}
          </Button>

          <div className="flex lg:hidden items-center gap-1">
            {mobileNavSplit.primary.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.to);
              return (
                <Button key={item.to} size="sm" variant="ghost" className={navClass(active)} asChild>
                  <Link to={`${item.to}${searchSuffix}`}>
                    <Icon className="w-4 h-4 mr-1 inline" />
                    <span className="sr-only sm:not-sr-only sm:inline">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1 text-[color:var(--club-muted)]">
                  <MoreHorizontal className="h-5 w-5 shrink-0" />
                  <span className="max-w-[4.5rem] truncate text-xs font-medium sm:max-w-none">{t.clubPage.moreNav}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[color:var(--club-tertiary)] border-[color:var(--club-border)] text-[color:var(--club-foreground)]">
                <SheetHeader>
                  <SheetTitle className="text-left text-[color:var(--club-foreground)]">
                    {t.clubPage.moreNav} · {club.name}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  {mobileNavSplit.more.map((item) => (
                    <Link
                      key={item.to}
                      to={`${item.to}${searchSuffix}`}
                      onClick={() => setMoreOpen(false)}
                      className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/10"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-white/10"
                    onClick={() => {
                      setMoreOpen(false);
                      openDashboardOrAuth();
                    }}
                  >
                    {t.clubPage.openDashboard}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
