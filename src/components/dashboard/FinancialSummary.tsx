import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import {
  fetchClubFinancialSnapshot,
  formatMoneyFromCents,
  type ClubFinancialSnapshot,
} from "@/lib/club-financial-snapshot";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface FinancialSummaryProps {
  compact?: boolean;
}

const FinancialSummary = ({ compact = false }: FinancialSummaryProps) => {
  const { clubId } = useClubId();
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<ClubFinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchClubFinancialSnapshot(clubId).then((data) => {
      if (!cancelled) {
        setSnapshot(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (!clubId) return null;

  const chartData =
    snapshot?.monthlySeries.map((row) => ({
      label: row.label,
      collected: row.collectedCents / 100,
      expenses: row.expensesCents / 100,
    })) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl glass-card border border-primary/20 bg-primary/5 p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-semibold text-foreground text-[15px] flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" strokeWidth={1.5} />
            {t.financial.sectionTitle}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">{t.financial.sectionDesc}</p>
        </div>
        <Link
          to="/reports?section=financial"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
        >
          {t.financial.viewFullReport}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t.financial.loading}
        </div>
      ) : snapshot ? (
        <>
          <div className={`grid gap-3 ${compact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-5"}`}>
            <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
              <div className="text-lg font-display font-bold text-emerald-400 tabular-nums">
                {formatMoneyFromCents(snapshot.collectedTotalCents, snapshot.currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{t.financial.collected}</div>
            </div>
            <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
              <div className="text-lg font-display font-bold text-primary tabular-nums">
                {formatMoneyFromCents(snapshot.outstandingTotalCents, snapshot.currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{t.financial.outstanding}</div>
            </div>
            <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
              <div className="text-lg font-display font-bold text-accent tabular-nums">
                {snapshot.overduePaymentCount + snapshot.overdueDuesCount}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{t.financial.overdueItems}</div>
            </div>
            <div className="rounded-xl bg-card/80 border border-border p-3 text-center">
              <div className="text-lg font-display font-bold text-foreground tabular-nums">
                {formatMoneyFromCents(snapshot.expensesTotalCents, snapshot.currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{t.financial.costs}</div>
            </div>
            <div className="rounded-xl bg-card/80 border border-primary/30 p-3 text-center col-span-2 lg:col-span-1">
              <div
                className={`text-lg font-display font-bold tabular-nums flex items-center justify-center gap-1 ${
                  snapshot.netCents >= 0 ? "text-emerald-400" : "text-destructive"
                }`}
              >
                {snapshot.netCents >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {formatMoneyFromCents(snapshot.netCents, snapshot.currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{t.financial.net}</div>
            </div>
          </div>

          {chartData.some((d) => d.collected > 0 || d.expenses > 0) ? (
            <div className="mt-4 h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string) => [
                      formatMoneyFromCents(Math.round(value * 100)),
                      name === "collected" ? t.financial.collected : t.financial.costs,
                    ]}
                  />
                  <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="collected" />
                  <Bar dataKey="expenses" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground py-4">{t.financial.emptyHint}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
            <Link to="/payments" className="text-primary hover:underline inline-flex items-center gap-1">
              {t.financial.linkPayments} <ArrowRight className="w-3 h-3" />
            </Link>
            <Link to="/dues" className="text-primary hover:underline inline-flex items-center gap-1">
              {t.financial.linkDues} <ArrowRight className="w-3 h-3" />
            </Link>
            {snapshot.overduePaymentCount + snapshot.overdueDuesCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-accent">
                <AlertTriangle className="w-3 h-3" />
                {t.financial.overdueFollowUp}
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </motion.div>
  );
};

export default FinancialSummary;
