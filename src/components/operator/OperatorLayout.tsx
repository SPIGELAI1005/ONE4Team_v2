import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { OperatorAlertsBanner } from "@/components/operator/OperatorAlertsBanner";
import { OperatorCommandPalette } from "@/components/operator/OperatorCommandPalette";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { OperatorTopBar } from "@/components/operator/OperatorTopBar";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { useLanguage } from "@/hooks/use-language";
import { getOperatorNavItems } from "@/lib/operator-nav";
import { hasOperatorPermission } from "@/lib/operator-permissions";
import { cn } from "@/lib/utils";

export function OperatorLayout() {
  const { access } = useOperatorAccess();
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileItems = getOperatorNavItems(t).filter((item) => hasOperatorPermission(access, item.permission));

  // Operator pages scroll inside this container (not window), so reset it to the
  // top on every route change instead of preserving the previous scroll offset.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 flex min-w-0 overflow-hidden bg-background">
      <OperatorCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <OperatorSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <OperatorTopBar onOpenSearch={() => setCommandOpen(true)} />
        <OperatorAlertsBanner />
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="flex gap-1 overflow-x-auto p-1">
            {mobileItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/operator"}
                className={({ isActive }) =>
                  cn(
                    "flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label.split(" ")[0]}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}