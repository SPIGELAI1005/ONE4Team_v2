import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/one4team-logo.png";
import { BrandedText } from "@/components/ai/Ai4TBrand";
import { useDashboardNav } from "@/hooks/use-dashboard-nav";
import { useDashboardNavLabels } from "@/hooks/use-dashboard-nav-labels";
import { pathnameToNavId } from "@/lib/dashboard-nav";

export default function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navLabels = useDashboardNavLabels();
  const { sidebarItems, roleLabel } = useDashboardNav(navLabels);

  const { t } = useLanguage();

  const active = pathnameToNavId(location.pathname);

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
            {roleLabel}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto px-2">
        {sidebarItems.map((item) => {
          const isActive = active === item.id;
          const isMarketplace = item.module === "marketplace";
          const itemClass = isActive
            ? isMarketplace
              ? "bg-primary/10 text-violet-600 dark:text-violet-400"
              : "bg-primary/10 text-primary"
            : isMarketplace
              ? "text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-500/8"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40";

          return (
          <motion.button
            key={`${item.module}-${item.id}`}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(item.route)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 mb-0.5 ${itemClass} ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
            {!collapsed && <span><BrandedText text={item.label} /></span>}
          </motion.button>
          );
        })}
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
}
