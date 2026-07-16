import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CalendarClock, ClipboardList, UserPlus, Wallet } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useActiveClub } from "@/hooks/use-active-club";
import {
  EMPTY_WEEK_AT_A_GLANCE,
  fetchAdminWeekAtAGlance,
  type AdminWeekAtAGlance,
} from "@/lib/admin-week-at-a-glance";
import { DASHBOARD_CARD, DASHBOARD_TYPE_SECTION_TITLE } from "@/lib/dashboard-page-shell";

export function AdminWeekAtAGlanceCard() {
  const { t } = useLanguage();
  const d = t.dashboard.weekAtAGlance;
  const { activeClubId } = useActiveClub();
  const [data, setData] = useState<AdminWeekAtAGlance>(EMPTY_WEEK_AT_A_GLANCE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeClubId) {
      setData(EMPTY_WEEK_AT_A_GLANCE);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchAdminWeekAtAGlance(activeClubId).then((snapshot) => {
      if (!cancelled) {
        setData(snapshot);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeClubId]);

  const items = [
    {
      key: "dues",
      icon: Wallet,
      label: d.unpaidDues,
      value: data.unpaidDues,
      hint: data.overdueDues > 0 ? d.overdueHint.replace("{count}", String(data.overdueDues)) : null,
      to: "/dues",
    },
    {
      key: "join",
      icon: UserPlus,
      label: d.joinRequests,
      value: data.pendingJoinRequests,
      hint: null,
      to: "/members?tab=join-requests",
    },
    {
      key: "rsvp",
      icon: CalendarClock,
      label: d.rsvpGaps,
      value: data.rsvpGapActivities,
      hint:
        data.rsvpPendingResponses > 0
          ? d.rsvpHint.replace("{count}", String(data.rsvpPendingResponses))
          : null,
      to: "/activities",
    },
    {
      key: "tasks",
      icon: ClipboardList,
      label: d.overdueTasks,
      value: data.overdueTasks,
      hint: null,
      to: "/tasks?filter=overdue",
    },
  ];

  return (
    <div className={DASHBOARD_CARD}>
      <h2 className={`${DASHBOARD_TYPE_SECTION_TITLE} mb-1 flex items-center gap-2`}>
        <AlertCircle className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
        {d.title}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-4">{d.subtitle}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className="rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors p-3 flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-display font-bold text-foreground leading-none">
                {loading ? "…" : item.value}
              </div>
              <div className="text-[12px] font-medium text-foreground mt-1">{item.label}</div>
              {item.hint ? (
                <div className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
