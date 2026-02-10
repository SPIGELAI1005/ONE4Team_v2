import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Trophy, MessageSquare,
  Briefcase, CreditCard, CalendarDays, BarChart3
} from "lucide-react";

type NavItem = { icon: React.ElementType; label: string; id: string; route?: string };

const roleMobileNav: Record<string, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: BarChart3, label: "Stats", id: "stats", route: "/player-stats" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
  ],
  trainer: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: BarChart3, label: "Stats", id: "stats", route: "/player-stats" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
  ],
  player: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: BarChart3, label: "Stats", id: "stats", route: "/player-stats" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
  ],
  sponsor: [
    { icon: LayoutDashboard, label: "Home", id: "overview" },
    { icon: Briefcase, label: "Contracts", id: "contracts" },
    { icon: CreditCard, label: "Invoices", id: "invoices" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
  ],
};

const defaultMobileNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", id: "overview" },
  { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
];

interface MobileBottomNavProps {
  active?: string;
  onNavigate?: (id: string) => void;
}

const MobileBottomNav = ({ active, onNavigate }: MobileBottomNavProps) => {
  const { role } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const items = roleMobileNav[role || ""] || defaultMobileNav;

  // Determine active from current route
  const currentActive = active || (() => {
    const path = location.pathname;
    if (path.includes("/matches")) return "matches";
    if (path.includes("/events")) return "events";
    if (path.includes("/player-stats")) return "stats";
    if (path.includes("/communication")) return "messages";
    return "overview";
  })();

  const handleNav = (item: NavItem) => {
    if (onNavigate) onNavigate(item.id);
    if (item.route) {
      navigate(item.route);
    } else if (item.id === "overview" && role) {
      navigate(`/dashboard/${role}`);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px] ${
              currentActive === item.id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentActive === item.id ? "text-primary" : ""}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
