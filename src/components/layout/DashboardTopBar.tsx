import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  Users,
  Trophy,
  Megaphone,
  CreditCard,
  Calendar,
  Swords,
  Building2,
  ClipboardList,
  Sparkles,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { TestModeBanner } from "@/components/ui/test-mode-banner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/use-permissions";
import { useActiveClub, notifyMembershipsUpdated } from "@/hooks/use-active-club";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { DashboardTopBarContext } from "@/contexts/dashboard-top-bar-context";
import ClubSwitcher from "@/components/dashboard/ClubSwitcher";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/one4team-logo.png";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  gate?: (p: ReturnType<typeof usePermissions>) => boolean;
}

export default function DashboardTopBar() {
  const ctx = useContext(DashboardTopBarContext);
  const config = ctx?.config ?? null;

  const navigate = useNavigate();
  const location = useLocation();
  const perms = usePermissions();
  const { activeClub } = useActiveClub();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const activeRole = (typeof window !== "undefined" ? localStorage.getItem("one4team.activeRole") : null) || null;
  const effectiveRole = activeRole || (perms.isAdmin ? "admin" : perms.isTrainer ? "trainer" : "player");
  const roleLabel = effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1);

  const subtitleResolved = useMemo(() => {
    if (config?.greeting) return config.greeting;
    const club = activeClub?.name || null;
    const subtitle = config?.subtitle;
    if (club && subtitle) return `${club} · ${subtitle}`;
    if (club && !subtitle) return club;
    return subtitle;
  }, [activeClub?.name, config?.greeting, config?.subtitle]);

  const dashboardTo = useMemo(() => `/dashboard/${effectiveRole}`, [effectiveRole]);

  const debugEnabled =
    (typeof window !== "undefined" && localStorage.getItem("one4team.debug") === "1") ||
    import.meta.env.DEV;

  const debugClubId = activeClub?.id || null;
  const debugMembershipRole = perms.role;
  const debugRouteRole = activeRole;

  const items = useMemo(() => {
    const navItems: NavItem[] = [
      { label: t.sidebar.members, to: "/members", icon: Users, gate: (p) => p.isAdmin },
      { label: t.teamsPage.tabs.teams, to: "/teams", icon: Trophy, gate: (p) => p.isTrainer },
      { label: t.sidebar.communication, to: "/communication", icon: Megaphone, gate: () => true },
      { label: t.sidebar.payments, to: "/payments", icon: CreditCard, gate: (p) => p.isAdmin },
      { label: t.sidebar.dues, to: "/dues", icon: CreditCard, gate: (p) => p.isTrainer },
      { label: t.sidebar.events, to: "/events", icon: Calendar, gate: () => true },
      { label: t.sidebar.schedule, to: "/activities", icon: ClipboardList, gate: () => true },
      { label: t.sidebar.matches, to: "/matches", icon: Swords, gate: () => true },
      { label: t.sidebar.partners, to: "/partners", icon: Building2, gate: (p) => p.has("partners:read") },
      { label: t.sidebar.oneAi, to: "/co-trainer", icon: Sparkles, gate: () => true },
    ];
    const base = navItems.filter((i) => (i.gate ? i.gate(perms) : true));
    return [{ label: t.sidebar.dashboard, to: dashboardTo, icon: Home }, ...base];
  }, [perms, dashboardTo, t]);

  useEffect(() => {
    if (!user) {
      setDisplayName("");
      setAvatarUrl("");
      return;
    }
    const run = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .single();
        const dn = (data as Record<string, unknown> | null)?.display_name as string | null;
        const av = (data as Record<string, unknown> | null)?.avatar_url as string | null;
        setDisplayName(dn || "");
        setAvatarUrl(av || "");
      } catch {
        setDisplayName("");
        setAvatarUrl("");
      }
    };
    void run();
  }, [user]);

  const userInitials = useMemo(() => {
    const cleanName = displayName.trim();
    if (cleanName) {
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    }
    const emailLocal = user?.email?.split("@")[0]?.replace(/[^a-zA-Z]/g, "") ?? "";
    return (emailLocal.slice(0, 2) || "U").toUpperCase();
  }, [displayName, user?.email]);

  const showBack = config?.showBack !== false;

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      setOpen(false);
      navigate("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  const titleText = config?.title?.trim() || t.sidebar.dashboard;

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/70 backdrop-blur-2xl">
      <div className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col gap-2 min-w-0">
          <div
            className="
              flex min-w-0 flex-wrap items-start justify-between gap-2
              sm:items-center
              lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:flex-nowrap lg:items-center lg:justify-start lg:gap-x-3
            "
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 lg:w-full lg:min-w-0 lg:max-w-full lg:overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 h-10 w-10 touch-manipulation"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? t.appHeader.closeMenu : t.appHeader.openMenu}
              >
                {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>

              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex shrink-0 h-9 w-9"
                  onClick={() => navigate(-1)}
                  aria-label={t.common.back}
                >
                  <span className="sr-only">{t.common.back}</span>
                  <span className="text-sm text-muted-foreground">←</span>
                </Button>
              )}

              <img src={logo} alt="" className="w-7 h-7 shrink-0 md:hidden" />

              <div className="min-w-0 flex-1 overflow-hidden lg:max-w-full">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="font-display min-w-0 truncate text-[15px] font-bold tracking-tight text-foreground sm:text-base lg:text-lg">
                    {titleText}
                  </h1>
                  <span className="hidden shrink-0 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] text-primary sm:inline-flex">
                    {roleLabel}
                  </span>
                </div>
                {subtitleResolved ? (
                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-muted-foreground sm:text-xs sm:line-clamp-none lg:line-clamp-2">
                    {subtitleResolved}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="hidden min-w-0 max-w-full flex-wrap items-center justify-end gap-2 lg:flex">
              {config?.renderRightSlot?.()}
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 lg:justify-self-end">
              <div className="hidden sm:block max-w-[200px] min-w-0">
                <ClubSwitcher />
              </div>
              <NotificationBell />
              <LanguageToggle size="sm" />
              <ThemeToggle size="sm" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-2xl bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-xs shadow-gold ml-0.5 hover:brightness-110 transition overflow-hidden shrink-0 touch-manipulation"
                    aria-label={t.sidebar.settings}
                    title={displayName ? `${displayName} · ${t.sidebar.settings}` : t.sidebar.settings}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      userInitials
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t.sidebar.settings}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    className="text-muted-foreground focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isSigningOut ? t.appHeader.signingOut : t.appHeader.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="lg:hidden flex flex-wrap items-center gap-2 min-w-0">
            <div className="sm:hidden w-full min-w-0">
              <ClubSwitcher />
            </div>
            {config?.renderRightSlot ? (
              <div className="flex flex-wrap items-center gap-2 w-full min-w-0">{config.renderRightSlot()}</div>
            ) : null}
          </div>
        </div>

        {debugEnabled && (
          <div className="hidden xl:flex items-center gap-2 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
            <span className="px-2 py-1 rounded-full border border-border/60 bg-card/40 backdrop-blur-xl">
              club: <span className="text-foreground/80">{debugClubId ? debugClubId.slice(0, 8) : "—"}</span>
            </span>
            <span className="px-2 py-1 rounded-full border border-border/60 bg-card/40 backdrop-blur-xl">
              memberRole: <span className="text-foreground/80">{debugMembershipRole ?? "—"}</span>
            </span>
            <span className="px-2 py-1 rounded-full border border-border/60 bg-card/40 backdrop-blur-xl">
              routeRole: <span className="text-foreground/80">{debugRouteRole ?? "—"}</span>
            </span>
          </div>
        )}
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/70 backdrop-blur-2xl max-h-[min(70vh,calc(100dvh-8rem))] overflow-y-auto">
          <div className="px-4 py-3 grid gap-3">
            {activeClub?.name && (
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-3">
                <div className="text-[11px] text-muted-foreground mb-2">{t.common.club}</div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{activeClub.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">active club</div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] text-muted-foreground">{t.appHeader.profile}</div>
                <button
                  type="button"
                  onClick={() => {
                    const next = localStorage.getItem("one4team.debug") === "1" ? "0" : "1";
                    localStorage.setItem("one4team.debug", next);
                    window.location.reload();
                  }}
                  className="text-[10px] px-2 py-1 rounded-full border border-border/60 bg-background/40 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.appHeader.debug}{" "}
                  {localStorage.getItem("one4team.debug") === "1" ? t.appHeader.debugOn : t.appHeader.debugOff}
                </button>
              </div>
              <div className="flex gap-2">
                {(perms.isAdmin ? ["admin", "trainer", "player"] : perms.isTrainer ? ["trainer", "player"] : ["player"]).map(
                  (r) => {
                    const isActive =
                      (activeRole || (perms.isAdmin ? "admin" : perms.isTrainer ? "trainer" : "player")) === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          localStorage.setItem("one4team.activeRole", r);
                          notifyMembershipsUpdated();
                          setOpen(false);
                          navigate(`/dashboard/${r}`);
                        }}
                        className={`flex-1 px-3 py-2 rounded-2xl text-xs font-medium border transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-background/40 text-foreground border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="grid gap-1">
              {items.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.label}-${item.to}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(item.to);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm border transition-colors ${
                      active
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-card/40 text-foreground border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? "bg-primary/10" : "bg-muted/30"}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-medium leading-tight truncate">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight truncate">{item.to}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {user && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-sm border border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                {isSigningOut ? t.appHeader.signingOut : t.appHeader.signOut}
              </button>
            )}
          </div>
        </div>
      )}

      <TestModeBanner />
    </header>
  );
}
