import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet,
  Loader2,
  Plus,
  Download,
  Trash2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useClubId } from "@/hooks/use-club-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import { CLUB_EXPENSE_CATEGORIES, type ClubExpenseCategory } from "@/lib/club-expense-categories";
import {
  createClubExpense,
  deleteClubExpense,
  exportFinancialCsv,
  fetchClubFinancialSnapshot,
  formatMoneyFromCents,
  type ClubFinancialSnapshot,
} from "@/lib/club-financial-snapshot";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, var(--muted-foreground)))",
  "hsl(var(--chart-3, var(--accent)))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--primary))",
];

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

const FinancialReportPanel = () => {
  const { clubId } = useClubId();
  const { isAdmin } = usePermissions();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [snapshot, setSnapshot] = useState<ClubFinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState<ClubExpenseCategory>("other");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const data = await fetchClubFinancialSnapshot(clubId);
    setSnapshot(data);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddExpense = async () => {
    if (!clubId || !isAdmin) return;
    setSaving(true);
    const { error } = await createClubExpense({
      clubId,
      expenseDate,
      category: expenseCategory,
      amountEur: expenseAmount,
      description: expenseDescription,
    });
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error, variant: "destructive" });
      return;
    }
    toast({ title: t.financial.expenseAdded });
    setShowAddExpense(false);
    setExpenseAmount("");
    setExpenseDescription("");
    await load();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!clubId || !isAdmin) return;
    const { error } = await deleteClubExpense(clubId, id);
    if (error) {
      toast({ title: t.common.error, description: error, variant: "destructive" });
      return;
    }
    toast({ title: t.financial.expenseDeleted });
    await load();
  };

  const handleExport = () => {
    if (!snapshot) return;
    const blob = new Blob([exportFinancialCsv(snapshot)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `club_financial_${clubId ?? "club"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!clubId) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t.reportsPage.noClubFound}</p>;
  }

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t.financial.adminOnly}</p>;
  }

  const categoryLabel = (cat: ClubExpenseCategory) =>
    t.financial.expenseCategories[cat as keyof typeof t.financial.expenseCategories] ?? cat;

  const revenuePie = snapshot
    ? [
        { name: t.financial.sourcePayments, value: snapshot.collectedPaymentsCents },
        { name: t.financial.sourceDues, value: snapshot.collectedDuesCents },
        ...(snapshot.hasShopData
          ? [{ name: t.financial.sourceShop, value: snapshot.collectedShopCents }]
          : []),
      ].filter((row) => row.value > 0)
    : [];

  const expensePie =
    snapshot?.expenseCategoryBreakdown.map((row) => ({
      name: categoryLabel(row.category),
      value: row.amountCents,
    })) ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            {t.financial.reportTitle}
          </CardTitle>
          <CardDescription className="text-xs">{t.financial.reportDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.financial.loading}
            </div>
          ) : snapshot ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <KpiTile
                  label={t.financial.collected}
                  value={formatMoneyFromCents(snapshot.collectedTotalCents)}
                  tone="text-emerald-400"
                />
                <KpiTile
                  label={t.financial.outstanding}
                  value={formatMoneyFromCents(snapshot.outstandingTotalCents)}
                  tone="text-primary"
                />
                <KpiTile
                  label={t.financial.costs}
                  value={formatMoneyFromCents(snapshot.expensesTotalCents)}
                />
                <KpiTile
                  label={t.financial.net}
                  value={formatMoneyFromCents(snapshot.netCents)}
                  tone={snapshot.netCents >= 0 ? "text-emerald-400" : "text-destructive"}
                />
                <KpiTile
                  label={t.financial.sourcePayments}
                  value={formatMoneyFromCents(snapshot.collectedPaymentsCents)}
                />
                <KpiTile
                  label={t.financial.sourceDues}
                  value={formatMoneyFromCents(snapshot.collectedDuesCents)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  {t.financial.exportCsv}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowAddExpense(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t.financial.addExpense}
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link to="/payments">
                    {t.financial.linkPayments}
                    <ArrowRight className="w-3 h-3 ml-1 opacity-60" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link to="/dues">
                    {t.financial.linkDues}
                    <ArrowRight className="w-3 h-3 ml-1 opacity-60" />
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {snapshot && !loading ? (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border/60 bg-background/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.financial.chartMonthlyTitle}</CardTitle>
                <CardDescription className="text-xs">{t.financial.chartMonthlyDesc}</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={snapshot.monthlySeries.map((row) => ({
                      label: row.label,
                      collected: row.collectedCents / 100,
                      outstanding: row.outstandingCents / 100,
                      expenses: row.expensesCents / 100,
                      net: row.netCents / 100,
                    }))}
                    margin={{ top: 8, right: 8, bottom: 8, left: -8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatMoneyFromCents(Math.round(value * 100)),
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="collected" name={t.financial.collected} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name={t.financial.costs} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outstanding" name={t.financial.outstanding} fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.financial.chartNetTitle}</CardTitle>
                <CardDescription className="text-xs">{t.financial.chartNetDesc}</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={snapshot.monthlySeries.map((row) => ({
                      label: row.label,
                      net: row.netCents / 100,
                    }))}
                    margin={{ top: 8, right: 8, bottom: 8, left: -8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number) => [formatMoneyFromCents(Math.round(value * 100)), t.financial.net]}
                    />
                    <Bar dataKey="net" name={t.financial.net} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border/60 bg-background/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.financial.revenueBreakdown}</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                {revenuePie.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">{t.financial.emptyRevenue}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenuePie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {revenuePie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMoneyFromCents(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.financial.costBreakdown}</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                {expensePie.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">{t.financial.emptyCosts}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {expensePie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMoneyFromCents(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {snapshot.feeTypeBreakdown.length > 0 ? (
            <Card className="border-border/60 bg-background/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.financial.feeTypeBreakdown}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {snapshot.feeTypeBreakdown.map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-foreground">{row.name}</span>
                    <span className="font-semibold tabular-nums text-emerald-400">
                      {formatMoneyFromCents(row.collectedCents)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/60 bg-background/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.financial.recentExpenses}</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.recentExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">{t.financial.emptyCosts}</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.recentExpenses.map((expense) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {categoryLabel(expense.category)}
                          {expense.description ? ` · ${expense.description}` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{expense.expense_date}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoneyFromCents(expense.amount_cents, expense.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => void handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
            {snapshot.netCents >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            )}
            <span>{t.financial.pnlNote}</span>
          </div>
        </>
      ) : null}

      {showAddExpense ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddExpense(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="font-display font-semibold text-foreground mb-4">{t.financial.addExpense}</h3>
            <div className="space-y-3">
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as ClubExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLUB_EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t.financial.amountPlaceholder}
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
              <Input
                placeholder={t.financial.descriptionPlaceholder}
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  className="bg-gradient-gold-static text-primary-foreground"
                  disabled={saving || !expenseAmount}
                  onClick={() => void handleAddExpense()}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FinancialReportPanel;
