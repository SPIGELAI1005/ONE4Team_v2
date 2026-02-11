import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Trophy, CreditCard,
  MessageSquare, Briefcase, ShoppingBag, Globe, Bot,
  Settings, LogOut, ChevronLeft, ChevronRight, CalendarDays, Swords, BarChart3
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

type NavItem = { icon: React.ElementType; label: string; id: string; route?: string };

const roleMenus: Record<string, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Users, label: "Members", id: "members", route: "/members" },
    { icon: Calendar, label: "Training", id: "training", route: "/teams" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: BarChart3, label: "Player Stats", id: "stats", route: "/player-stats" },
    { icon: CreditCard, label: "Payments", id: "payments", route: "/payments" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
    { icon: Briefcase, label: "Partners", id: "partners" },
    { icon: ShoppingBag, label: "Shop", id: "shop" },
    { icon: Globe, label: "Club Page", id: "clubpage" },
    { icon: Bot, label: "Co-AImin", id: "ai", route: "/co-trainer" },
    { icon: Settings, label: "Settings", id: "settings" },
  ],
  trainer: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Users, label: "My Teams", id: "teams", route: "/teams" },
    { icon: Calendar, label: "Training", id: "training", route: "/teams" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: BarChart3, label: "Player Stats", id: "stats", route: "/player-stats" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
    { icon: Bot, label: "Co-Trainer", id: "ai", route: "/co-trainer" },
  ],
  player: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Calendar, label: "Schedule", id: "schedule" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: BarChart3, label: "Player Stats", id: "stats", route: "/player-stats" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
    { icon: ShoppingBag, label: "Shop", id: "shop" },
  ],
  sponsor: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Briefcase, label: "Contracts", id: "contracts" },
    { icon: CreditCard, label: "Invoices", id: "invoices" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
  ],
  supplier: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Briefcase, label: "Orders", id: "orders" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
  ],
  service: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Briefcase, label: "Contracts", id: "contracts" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
  ],
  consultant: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Briefcase, label: "Engagements", id: "engagements" },
    { icon: MessageSquare, label: "Messages", id: "messages" },
  ],
};

const defaultMenu: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
  { icon: MessageSquare, label: "Messages", id: "messages" },
];

const DashboardSidebar = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("overview");

  const items = roleMenus[role || ""] || defaultMenu;
  const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : "User";

  return (
    <aside className={`h-screen glass-sidebar flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-[68px]" : "w-60"}`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4" style={{ borderBottom: '0.5px solid hsl(0 0% 100% / 0.06)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="w-7 h-7" />
            <span className="font-display font-bold text-sm text-foreground">
              One<span className="text-gradient-gold">4</span>Team
            </span>
          </div>
        )}
        {collapsed && <img src={logo} alt="" className="w-7 h-7 mx-auto" />}
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground hidden lg:block haptic-press">
          {collapsed ? <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> : <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid hsl(0 0% 100% / 0.06)' }}>
          <span className="ios-pill text-primary bg-primary/8">
            {roleName}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto px-2">
        {items.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setActive(item.id);
              if (item.route) navigate(item.route);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 mb-0.5 ${
              active === item.id
                ? "bg-primary/10 text-primary shadow-[inset_0_0.5px_0_hsl(0_0%_100%/0.08)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            } ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>{item.label}</span>}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2" style={{ borderTop: '0.5px solid hsl(0 0% 100% / 0.06)' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/40 transition-all duration-200 ${collapsed ? "justify-center px-2" : ""}`}
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {!collapsed && <span>Exit</span>}
        </motion.button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
