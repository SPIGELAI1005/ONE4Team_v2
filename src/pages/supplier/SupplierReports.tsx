import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Building2, Loader2, Store, TrendingUp } from "lucide-react";
import { DashboardHeaderSlot } from "@/components/layout/DashboardHeaderSlot";
import { useLanguage } from "@/hooks/use-language";
import { useSupplierCollaborations } from "@/hooks/use-supplier-collaborations";
import {
  aggregateSupplierRevenueByMonth,
  fetchSupplierInvoices,
  type SupplierInvoiceRow,
} from "@/lib/supplier-collaboration";
import { DASHBOARD_PAGE_INNER, DASHBOARD_PAGE_ROOT } from "@/lib/dashboard-page-shell";

function formatEur(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(value);
}

export default function SupplierReportsPage() {
  const { t } = useLanguage();
  const sp = t.supplierPortal;
  const { collaborations, partnerIds, loading: collabLoading } = useSupplierCollaborations();
  const [invoices, setInvoices] = useState<SupplierInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (collabLoading) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const rows = await fetchSupplierInvoices(partnerIds);
      if (!cancelled) {
        setInvoices(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerIds, collabLoading]);

  const monthly = useMemo(() => aggregateSupplierRevenueByMonth(invoices), [invoices]);
  const totalPaid = useMemo(
    () => invoices.filter((row) => row.invoice_status === "paid").reduce((sum, row) => sum + Number(row.amount_eur), 0),
    [invoices],
  );
  const openCount = useMemo(
    () => invoices.filter((row) => row.invoice_status === "pending" || row.invoice_status === "overdue").length,
    [invoices],
  );

  return (
    <div className={DASHBOARD_PAGE_ROOT}>
      <DashboardHeaderSlot title={sp.reportsTitle} greeting={sp.reportsSubtitle} showBack={false} />

      <div className={`${DASHBOARD_PAGE_INNER} space-y-5`}>
        {loading || collabLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : collaborations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm">{sp.reportsNoCollaborations}</p>
            <Link to="/partner-marketplace" className="text-primary hover:underline mt-3 inline-flex items-center gap-1 text-sm">
              <Store className="h-3.5 w-3.5" />
              {sp.openMarketplace}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
                <div className="text-[11px] text-muted-foreground">{sp.reportsActiveClubs}</div>
                <div className="text-2xl font-display font-bold mt-1">{collaborations.length}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
                <div className="text-[11px] text-muted-foreground">{sp.reportsPaidTotal}</div>
                <div className="text-2xl font-display font-bold mt-1">{formatEur(totalPaid)}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
                <div className="text-[11px] text-muted-foreground">{sp.reportsOpenInvoices}</div>
                <div className="text-2xl font-display font-bold mt-1">{openCount}</div>
              </div>
            </div>

            <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{sp.reportsMonthlyRevenue}</h2>
              </div>
              {monthly.length === 0 ? (
                <p className="text-sm text-muted-foreground">{sp.reportsNoInvoices}</p>
              ) : (
                <div className="space-y-2">
                  {monthly.map((row) => (
                    <div
                      key={row.month}
                      className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2 text-sm"
                    >
                      <span>{row.label}</span>
                      <span className="font-medium">
                        {formatEur(row.paidEur)} / {formatEur(row.totalEur)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{sp.reportsByClub}</h2>
              </div>
              <div className="space-y-2">
                {collaborations.map((row) => (
                  <div
                    key={row.partnerId}
                    className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span>{row.clubName}</span>
                    <span className="text-muted-foreground text-xs">{row.partnerType}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
