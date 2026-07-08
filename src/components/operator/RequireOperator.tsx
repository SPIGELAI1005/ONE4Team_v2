import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorAccess } from "@/hooks/use-operator-access";
import type { OperatorPermission } from "@/lib/operator-permissions";
import { OperatorGateLoadingCard, OperatorGateShell } from "@/components/operator/OperatorGateShell";

interface RequireOperatorProps {
  children: React.ReactNode;
  requiredPermission?: OperatorPermission;
}

function buildBootstrapSql(email: string): string {
  return `insert into public.platform_users (auth_user_id, email, role, status)
select id, email, 'OWNER', 'ACTIVE'
from auth.users
where lower(email) = lower('${email.replace(/'/g, "''")}')
on conflict (auth_user_id) do update
set role = excluded.role, status = 'ACTIVE', updated_at = now();`;
}

export function RequireOperator({ children, requiredPermission }: RequireOperatorProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const { isLoading, isError, error, isAllowed } = useOperatorAccess({ requiredPermission });
  const g = t.operator.gate;

  if (authLoading || isLoading) {
    return (
      <OperatorGateShell language={language} controlCenterLabel={t.operator.shell.controlCenter}>
        <OperatorGateLoadingCard message={g.verifying} />
      </OperatorGateShell>
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!isAllowed) {
    const bootstrapSql = user.email ? buildBootstrapSql(user.email) : null;

    return (
      <OperatorGateShell language={language} controlCenterLabel={t.operator.shell.controlCenter} onLogoClick={() => navigate("/")}>
        <div className="rounded-2xl glass-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">{g.accessRequired}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{g.accessBody}</p>
          {user.email ? (
            <p className="mt-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {g.signedInAs} <span className="font-medium text-foreground">{user.email}</span>
            </p>
          ) : null}
          {isError ? (
            <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              {error instanceof Error ? error.message : g.verifyFailed}
            </p>
          ) : null}
          {import.meta.env.DEV && bootstrapSql ? (
            <div className="mt-4 space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">{g.localBootstrap}</p>
              <pre className="max-h-32 overflow-auto rounded-lg bg-background/80 p-2 text-[10px] leading-relaxed text-muted-foreground">
                {bootstrapSql}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void navigator.clipboard.writeText(bootstrapSql)}
              >
                {g.copyBootstrap}
              </Button>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1" variant="outline">
              <a href="/">{g.goHome}</a>
            </Button>
            <Button asChild className="flex-1">
              <a href="/auth">{g.switchAccount}</a>
            </Button>
          </div>
        </div>
      </OperatorGateShell>
    );
  }

  return <>{children}</>;
}
