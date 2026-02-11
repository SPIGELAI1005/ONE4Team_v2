import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Home, Users, Trophy, Megaphone, CreditCard, Calendar, Swords, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { useActiveClub } from "@/hooks/use-active-club";
import logo from "@/assets/logo.png";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  gate?: (p: ReturnType<typeof usePermissions>) => boolean;
}

const navItems: NavItem[] = [
  // Dashboard link is injected dynamically from activeRole (route-driven)
  { label: "Members", to: "/members", icon: Users, gate: (p) => p.isAdmin },
  { label: "Teams", to: "/teams", icon: Trophy, gate: (p) => p.isTrainer },
  { label: "Communication", to: "/communication", icon: Megaphone, gate: () => true },
  { label: "Payments", to: "/payments", icon: CreditCard, gate: (p) => p.isAdmin },
  { label: "Events", to: "/events", icon: Calendar, gate: () => true },
  { label: "Matches", to: "/matches", icon: Swords, gate: () => true },
];

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightSlot?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, back = true, rightSlot }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const perms = usePermissions();
  const { activeClub } = useActiveClub();

  const [open, setOpen] = useState(false);

  const activeRole = (typeof window !== "undefined" ? localStorage.getItem("one4team.activeRole") : null) || null;
  const effectiveRole = activeRole || (perms.isAdmin ? "admin" : perms.isTrainer ? "trainer" : "player");
  const roleLabel = effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1);

  const subtitleResolved = useMemo(() => {
    const club = activeClub?.name || null;
    if (club && subtitle) return `${club} · ${subtitle}`;
    if (club && !subtitle) return club;
    return subtitle;
  }, [activeClub?.name, subtitle]);

  const dashboardTo = useMemo(() => `/dashboard/${effectiveRole}`, [effectiveRole]);

  const items = useMemo(() => {
    const base = navItems.filter((i) => (i.gate ? i.gate(perms) : true));
    return [{ label: "Dashboard", to: dashboardTo, icon: Home }, ...base];
  }, [perms, dashboardTo]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-2xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>

          {back && (
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate(-1)} aria-label="Back">
              <span className="sr-only">Back</span>
              {/* simple chevron-less back to keep iOS-clean */}
              <span className="text-sm text-muted-foreground">←</span>
            </Button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-display font-bold text-[15px] sm:text-base text-foreground tracking-tight truncate">{title}</h1>
                <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                  {roleLabel}
                </span>
              </div>
              {subtitleResolved && <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitleResolved}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightSlot}
          <span className="md:hidden text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/70 backdrop-blur-2xl">
          <div className="container mx-auto px-4 py-3 grid gap-3">
            {/* Active club context */}
            {activeClub?.name && (
              <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-3">
                <div className="text-[11px] text-muted-foreground mb-2">Club</div>
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

            {/* Quick profile switch (A: route role-driven) */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-3">
              <div className="text-[11px] text-muted-foreground mb-2">Profile</div>
              <div className="flex gap-2">
                {(
                  perms.isAdmin
                    ? ["admin", "trainer", "player"]
                    : perms.isTrainer
                      ? ["trainer", "player"]
                      : ["player"]
                ).map((r) => {
                  const isActive = (activeRole || (perms.isAdmin ? "admin" : perms.isTrainer ? "trainer" : "player")) === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        localStorage.setItem("one4team.activeRole", r);
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
                })}
              </div>
            </div>

            <div className="grid gap-1">
              {items.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.label}-${item.to}`}
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
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? "bg-primary/10" : "bg-muted/30"}`}>
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
          </div>
        </div>
      )}
    </header>
  );
}
