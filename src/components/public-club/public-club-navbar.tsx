import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  CalendarDays,
  FileText,
  Home,
  LayoutDashboard,
  Menu,
  Newspaper,
  Phone,
  Swords,
  Trophy,
  UserPlus,
} from "lucide-react";
import { usePublicClub } from "@/contexts/public-club-context";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getEnabledPublicPages, publicNavIdToPathSegment } from "@/lib/public-page-flex-config";
import type { PublicMicroPageId } from "@/lib/club-page-settings-helpers";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { clubCtaFillHoverClass } from "@/lib/public-club-cta-classes";
import { cn } from "@/lib/utils";
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
  switch (id) {
    case "home":
      return Home;
    case "news":
      return Newspaper;
    case "teams":
      return Trophy;
    case "schedule":
      return Calendar;
    case "matches":
      return Swords;
    case "events":
      return CalendarDays;
    case "documents":
      return FileText;
    case "join":
      return UserPlus;
    case "contact":
      return Phone;
    default:
      return LayoutDashboard;
  }
}

export function PublicClubNavbar() {
  const { t } = useLanguage();
  const { club, basePath, searchSuffix, openDashboardOrAuth, checkingMembership } = usePublicClub();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopItems = useMemo(() => {
    if (!club) return [];
    return getEnabledPublicPages(club.publicPageLayout).map((e) => {
      const seg = publicNavIdToPathSegment(e.id);
      const to = e.id === "home" ? basePath : `${basePath}/${seg}`;
      const label = e.navLabel.trim() || defaultNavLabel(e.id, t);
      return { to, label, id: e.id };
    });
  }, [basePath, club, t]);

  if (!club) return null;

  const dashboardFillStyle = {
    backgroundColor: "var(--club-primary)",
    color: readableTextOnSolid(club.primary_color || "#C4A052"),
  } as const;

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

        <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
          <Button
            size="sm"
            className={`hidden lg:inline-flex shrink-0 font-semibold ${clubCtaFillHoverClass}`}
            style={dashboardFillStyle}
            onClick={openDashboardOrAuth}
            disabled={checkingMembership}
          >
            <LayoutDashboard className="mr-1 h-4 w-4" />
            {t.clubPage.openDashboard}
          </Button>

          <div className="flex items-center gap-2 lg:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 p-0 text-[color:var(--club-foreground)] hover:bg-white/10"
                  aria-label={t.appHeader.openMenu}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-[color:var(--club-border)] bg-[color:var(--club-tertiary)] text-[color:var(--club-foreground)]"
              >
                <SheetHeader>
                  <SheetTitle className="text-left text-[color:var(--club-foreground)]">{club.name}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {desktopItems.map((item) => {
                    const Icon = iconForNavId(item.id);
                    const active = isActivePath(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={`${item.to}${searchSuffix}`}
                        end={item.to === basePath}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-white/15 text-[color:var(--club-foreground)]"
                            : "text-[color:var(--club-muted)] hover:bg-white/10 hover:text-[color:var(--club-foreground)]",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </nav>
                <div className="mt-6 border-t border-[color:var(--club-border)] pt-4">
                  <Button
                    type="button"
                    className={`w-full font-semibold ${clubCtaFillHoverClass}`}
                    style={dashboardFillStyle}
                    onClick={() => {
                      setMenuOpen(false);
                      void openDashboardOrAuth();
                    }}
                    disabled={checkingMembership}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t.clubPage.openDashboard}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              type="button"
              size="sm"
              className={`shrink-0 px-2.5 font-semibold sm:px-3 ${clubCtaFillHoverClass}`}
              style={dashboardFillStyle}
              onClick={() => void openDashboardOrAuth()}
              disabled={checkingMembership}
            >
              <LayoutDashboard className="h-4 w-4 sm:mr-1.5" />
              <span className="sr-only sm:not-sr-only">{t.clubPage.openDashboard}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
