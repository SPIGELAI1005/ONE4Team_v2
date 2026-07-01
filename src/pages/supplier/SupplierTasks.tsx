import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Loader2, Store } from "lucide-react";
import { format } from "date-fns";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/useAuth";
import { useSupplierCollaborations } from "@/hooks/use-supplier-collaborations";
import {
  fetchSupplierPartnerTasks,
  updateSupplierPartnerTaskStatus,
  type SupplierPartnerTaskRow,
} from "@/lib/supplier-collaboration";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";
import { cn } from "@/lib/utils";

export default function SupplierTasksPage() {
  const { t } = useLanguage();
  const sp = t.supplierPortal;
  const { user } = useAuth();
  const { collaborations, partnerIds, loading: collabLoading } = useSupplierCollaborations();
  const [tasks, setTasks] = useState<SupplierPartnerTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const clubNameByPartner = useMemo(
    () => new Map(collaborations.map((row) => [row.partnerId, row.clubName])),
    [collaborations],
  );

  useEffect(() => {
    if (!user?.id || collabLoading) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const rows = await fetchSupplierPartnerTasks(partnerIds);
      if (!cancelled) {
        setTasks(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, partnerIds, collabLoading]);

  const markDone = async (taskId: string) => {
    setUpdatingId(taskId);
    const { error } = await updateSupplierPartnerTaskStatus(taskId, "done");
    if (!error) {
      setTasks((prev) =>
        prev.map((row) => (row.id === taskId ? { ...row, task_status: "done" } : row)),
      );
    }
    setUpdatingId(null);
  };

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={sp.tasksTitle} greeting={sp.tasksSubtitle} showBack={false} />

      <div className={`${DASHBOARD_PAGE_INNER} space-y-4`}>
        {loading || collabLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm">{sp.tasksEmpty}</p>
            <Link to="/partner-marketplace" className="text-primary hover:underline mt-3 inline-flex items-center gap-1 text-sm">
              <Store className="h-3.5 w-3.5" />
              {sp.openMarketplace}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const clubName =
                clubNameByPartner.get(task.partner_id) ??
                task.clubs?.name ??
                task.partners?.name ??
                sp.unknownClub;
              const open = task.task_status !== "done" && task.task_status !== "cancelled";
              return (
                <article
                  key={task.id}
                  className="rounded-2xl border border-border/60 bg-card/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {clubName}
                      </Badge>
                    </div>
                    {task.description ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    ) : null}
                    <div className="text-[11px] text-muted-foreground mt-2 flex flex-wrap gap-3">
                      <span>{sp.taskStatus}: {task.task_status}</span>
                      {task.due_date ? (
                        <span>
                          {sp.taskDue}: {format(new Date(task.due_date), "dd.MM.yyyy")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {open ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn("shrink-0")}
                      disabled={updatingId === task.id}
                      onClick={() => void markDone(task.id)}
                    >
                      {updatingId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {sp.markDone}
                        </>
                      )}
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
