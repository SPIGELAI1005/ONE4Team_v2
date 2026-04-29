import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Trophy, MessageSquare,
  Briefcase, CreditCard, CalendarDays, BarChart3,
  Calendar, ShoppingBag
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

type NavItem = { icon: React.ElementType; label: string; id: string; route?: string };

interface MobileBottomNavProps {
  active?: string;
  onNavigate?: (id: string) => void;
}

const MobileBottomNav = ({ active, onNavigate }: MobileBottomNavProps) => {
  const { t } = useLanguage();
  const { role } = useParams();
  const activeRole = (typeof window !== "undefined"
    ? localStorage.getItem("one4team.activeRole") || localStorage.getItem("one4team_role")
    : null) || null;
  const effectiveRole = role || activeRole || "";
  const navigate = useNavigate();
  const location = useLocation();

  const roleMobileNav: Record<string, NavItem[]> = {
    admin: [
      { icon: LayoutDashboard, label: t.common.home, id: "overview" },
      { icon: Trophy, label: t.sidebar.matches, id: "matches", route: "/matches" },
      { icon: CalendarDays, label: t.sidebar.events, id: "events", route: "/events" },
      { icon: BarChart3, label: t.sidebar.playerStats, id: "stats", route: "/reports" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
    trainer: [
      { icon: LayoutDashboard, label: t.common.home, id: "overview" },
      { icon: CalendarDays, label: t.sidebar.schedule, id: "schedule", route: "/activities" },
      { icon: Trophy, label: t.sidebar.matches, id: "matches", route: "/matches" },
      { icon: BarChart3, label: t.sidebar.playerStats, id: "stats", route: "/reports" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
    player: [
      { icon: LayoutDashboard, label: t.common.home, id: "overview" },
      { icon: Calendar, label: t.sidebar.schedule, id: "schedule", route: "/activities" },
      { icon: Trophy, label: t.sidebar.matches, id: "matches", route: "/matches" },
      { icon: ShoppingBag, label: t.sidebar.shop, id: "shop", route: "/shop" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
    sponsor: [
      { icon: LayoutDashboard, label: t.common.home, id: "overview" },
      { icon: Briefcase, label: t.sidebar.contracts, id: "contracts" },
      { icon: CreditCard, label: t.sidebar.invoices, id: "invoices" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
  };

  const defaultMobileNav: NavItem[] = [
    { icon: LayoutDashboard, label: t.common.home, id: "overview" },
    { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
  ];

  const items = roleMobileNav[effectiveRole] || defaultMobileNav;

  const currentActive = active || (() => {
    const path = location.pathname;
    if (path.includes("/activities")) return "schedule";
    if (path.includes("/matches")) return "matches";
    if (path.includes("/events")) return "events";
    if (path.includes("/reports") || path.includes("/player-stats")) return "stats";
    if (path.includes("/communication")) return "messages";
    if (path.includes("/shop")) return "shop";
    return "overview";
  })();

  const handleNav = (item: NavItem) => {
    if (onNavigate) onNavigate(item.id);
    if (item.route) {
      navigate(item.route);
    } else if (item.id === "overview" && effectiveRole) {
      navigate(`/dashboard/${effectiveRole}`);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-bottom-bar lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.85 }}
            onClick={() => handleNav(item)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[56px] ${
              currentActive === item.id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <div className={`relative ${currentActive === item.id ? "" : ""}`}>
              <item.icon className="w-[22px] h-[22px]" strokeWidth={currentActive === item.id ? 2 : 1.5} />
              {currentActive === item.id && (
                <motion.div
                  layoutId="tab-glow"
                  className="absolute -inset-2 rounded-xl bg-primary/10"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </div>
            <span className={`text-[10px] ${currentActive === item.id ? "font-semibold" : "font-medium"}`}>
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
