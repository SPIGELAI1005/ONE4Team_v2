import { Link, useLocation } from "react-router-dom";
import { LogOut, Search, Shield, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import { getOperatorSectionTitle } from "@/lib/operator-nav";
import logo from "@/assets/one4team-logo.png";

export function OperatorTopBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { role } = useOperatorAccess();
  const title = getOperatorSectionTitle(location.pathname, t);
  const o = t.operator.shell;

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[92rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 lg:flex">
            <img src={logo} alt="ONE4Team" className="h-6 w-6 drop-shadow-sm" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
              <Shield className="h-2.5 w-2.5" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Shield className="h-3.5 w-3.5 lg:hidden" />
              ONE4Team {o.controlCenter}
            </div>
            <h1 className="truncate font-display text-lg font-bold text-foreground sm:text-xl">{title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={onOpenSearch}>
            <Search className="mr-2 h-4 w-4" />
            {o.search}
            <kbd className="ml-2 rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Ctrl K
            </kbd>
          </Button>
          <LanguageToggle size="sm" />
          <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
            {role ?? o.operator}
          </Badge>
          <div className="hidden min-w-0 items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <UserCircle className="h-4 w-4" />
            <span className="max-w-44 truncate">{user?.email ?? o.operator}</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">{o.home}</Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label={o.signOut} onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
