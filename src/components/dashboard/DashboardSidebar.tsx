import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import {
  LayoutDashboard, Users, Calendar, Trophy, CreditCard,
  MessageSquare, Briefcase, ShoppingBag, Globe, Bot,
  Settings, LogOut, ChevronLeft, ChevronRight, CalendarDays, Swords, BarChart3
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/one4team-logo.png";

type NavItem = { icon: React.ElementType; label: string; id: string; route?: string };

const DashboardSidebar = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("overview");
  const { t } = useLanguage();

  const roleMenus: Record<string, NavItem[]> = {
    admin: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Users, label: t.sidebar.members, id: "members", route: "/members" },
      { icon: Calendar, label: t.sidebar.training, id: "training", route: "/teams" },
      { icon: Trophy, label: t.sidebar.matches, id: "matches", route: "/matches" },
      { icon: CalendarDays, label: t.sidebar.events, id: "events", route: "/events" },
      { icon: BarChart3, label: t.sidebar.playerStats, id: "stats", route: "/player-stats" },
      { icon: CreditCard, label: t.sidebar.payments, id: "payments", route: "/payments" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
      { icon: Briefcase, label: t.sidebar.partners, id: "partners", route: "/partners" },
      { icon: ShoppingBag, label: t.sidebar.shop, id: "shop" },
      { icon: Globe, label: t.sidebar.clubPage, id: "clubpage" },
      { icon: Bot, label: t.sidebar.coAImin, id: "ai", route: "/co-trainer" },
      { icon: Settings, label: t.sidebar.settings, id: "settings" },
    ],
    trainer: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Calendar, label: t.sidebar.schedule, id: "schedule", route: "/activities" },
      { icon: Users, label: t.sidebar.myTeams, id: "teams", route: "/teams" },
      { icon: Trophy, label: t.sidebar.matches, id: "matches", route: "/matches" },
      { icon: CalendarDays, label: t.sidebar.events, id: "events", route: "/events" },
      { icon: BarChart3, label: t.sidebar.playerStats, id: "stats", route: "/player-stats" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
      { icon: Bot, label: t.sidebar.coTrainer, id: "ai", route: "/co-trainer" },
    ],
    player: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Calendar, label: t.sidebar.schedule, id: "schedule", route: "/activities" },
      { icon: Trophy, label: t.sidebar.matches, id: "matches", route: "/matches" },
      { icon: CalendarDays, label: t.sidebar.events, id: "events", route: "/events" },
      { icon: BarChart3, label: t.sidebar.playerStats, id: "stats", route: "/player-stats" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
      { icon: ShoppingBag, label: t.sidebar.shop, id: "shop" },
    ],
    sponsor: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Briefcase, label: t.sidebar.contracts, id: "contracts" },
      { icon: CreditCard, label: t.sidebar.invoices, id: "invoices" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
    supplier: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Briefcase, label: t.sidebar.orders, id: "orders" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
    service: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Briefcase, label: t.sidebar.contracts, id: "contracts" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
    consultant: [
      { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
      { icon: Briefcase, label: t.sidebar.engagements, id: "engagements" },
      { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
    ],
  };

  const defaultMenu: NavItem[] = [
    { icon: LayoutDashboard, label: t.sidebar.dashboard, id: "overview" },
    { icon: MessageSquare, label: t.sidebar.messages, id: "messages", route: "/communication" },
  ];

  const items = roleMenus[role || ""] || defaultMenu;
  const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : "User";

  return (
    <aside className={`h-screen glass-sidebar flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-[68px]" : "w-60"}`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/60">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="w-7 h-7" />
            <span className="font-logo text-sm text-foreground">
              ONE <span className="text-gradient-gold-animated">4</span> Team
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
        <div className="px-4 py-3 border-b border-border/60">
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
                ? "bg-primary/10 text-primary"
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
      <div className="p-2 border-t border-border/60">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/40 transition-all duration-200 ${collapsed ? "justify-center px-2" : ""}`}
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {!collapsed && <span>{t.sidebar.exit}</span>}
        </motion.button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
