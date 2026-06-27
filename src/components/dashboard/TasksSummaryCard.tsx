import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { useClubId } from "@/hooks/use-club-id";
import { useLanguage } from "@/hooks/use-language";
import { fetchMyOpenTaskCount } from "@/hooks/use-club-tasks";

export function TasksSummaryCard() {
  const { user } = useAuth();
  const { clubId } = useClubId();
  const { t } = useLanguage();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!clubId || !user) {
      setCount(null);
      return;
    }
    void fetchMyOpenTaskCount(clubId, user.id).then(setCount);
  }, [clubId, user]);

  if (count === null || count === 0) return null;

  return (
    <Link
      to="/tasks?filter=mine"
      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-2xl transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.tasksPage.dashboardCardTitle}</p>
          <p className="text-xs text-muted-foreground">
            {t.tasksPage.dashboardCardSubtitle.replace("{count}", String(count))}
          </p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
