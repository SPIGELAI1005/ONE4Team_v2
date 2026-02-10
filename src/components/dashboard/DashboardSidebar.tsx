import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Trophy, CreditCard,
  MessageSquare, Briefcase, ShoppingBag, Globe, Bot,
  Settings, LogOut, ChevronLeft, ChevronRight, CalendarDays, Swords
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

type NavItem = { icon: React.ElementType; label: string; id: string; route?: string };

const roleMenus: Record<string, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Users, label: "Members", id: "members", route: "/members" },
    { icon: Calendar, label: "Training", id: "training", route: "/teams" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: CreditCard, label: "Payments", id: "payments", route: "/payments" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
    { icon: Briefcase, label: "Partners", id: "partners" },
    { icon: ShoppingBag, label: "Shop", id: "shop" },
    { icon: Globe, label: "Club Page", id: "clubpage" },
    { icon: Bot, label: "Co-AImin", id: "ai" },
    { icon: Settings, label: "Settings", id: "settings" },
  ],
  trainer: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Users, label: "My Teams", id: "teams", route: "/teams" },
    { icon: Calendar, label: "Training", id: "training", route: "/teams" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
    { icon: MessageSquare, label: "Messages", id: "messages", route: "/communication" },
    { icon: Bot, label: "Co-Trainer", id: "ai" },
  ],
  player: [
    { icon: LayoutDashboard, label: "Dashboard", id: "overview" },
    { icon: Calendar, label: "Schedule", id: "schedule" },
    { icon: Trophy, label: "Matches", id: "matches", route: "/matches" },
    { icon: CalendarDays, label: "Events", id: "events", route: "/events" },
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
    <aside className={`h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-7 h-7" />
            <span className="font-display font-bold text-sm text-sidebar-foreground">
              One<span className="text-gradient-gold">4</span>Team
            </span>
          </div>
        )}
        {collapsed && <img src={logo} alt="" className="w-7 h-7 mx-auto" />}
        <button onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground/50 hover:text-sidebar-foreground hidden lg:block">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {roleName}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActive(item.id);
              if (item.route) navigate(item.route);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              active === item.id
                ? "text-sidebar-primary bg-sidebar-accent border-r-2 border-sidebar-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            } ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/50 transition-colors ${collapsed ? "justify-center px-2" : ""}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Exit</span>}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
