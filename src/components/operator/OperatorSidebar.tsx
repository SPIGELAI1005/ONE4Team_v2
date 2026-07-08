import { NavLink } from "react-router-dom";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { getOperatorNavItems } from "@/lib/operator-nav";
import { hasOperatorPermission } from "@/lib/operator-permissions";
import { cn } from "@/lib/utils";
import logo from "@/assets/one4team-logo.png";

export function OperatorSidebar() {
  const { t } = useLanguage();
  const { access, role } = useOperatorAccess();
  const visibleItems = getOperatorNavItems(t).filter((item) => hasOperatorPermission(access, item.permission));
  const operatorName = access.displayName ?? access.email ?? t.operator.shell.operator;
  const o = t.operator.shell;

  return (
    <aside className="hidden h-full w-72 shrink-0 border-r border-border/70 bg-card/40 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <img src={logo} alt="ONE4Team" className="h-7 w-7 drop-shadow-sm" />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
            <Shield className="h-3 w-3" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-foreground">ONE4Team</p>
          <p className="truncate text-xs text-muted-foreground">{o.controlCenter}</p>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/operator"}
            className={({ isActive }) =>
              cn(
                "group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium leading-tight">{item.label}</span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-snug opacity-75">
                {item.description}
              </span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-3">
        <div className="text-xs text-muted-foreground">{o.operator}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{operatorName}</div>
            {access.email ? <div className="truncate text-xs text-muted-foreground">{access.email}</div> : null}
          </div>
          <Badge variant="outline" className="shrink-0 capitalize">
            {role ?? o.verified}
          </Badge>
        </div>
      </div>
    </aside>
  );
}
