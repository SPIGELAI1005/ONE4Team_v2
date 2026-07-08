import { useMemo, useState } from "react";
import {
  Building,
  Clock,
  Code2,
  Coins,
  Euro,
  LineChart,
  PiggyBank,
  ReceiptEuro,
  TerminalSquare,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OperatorMetricCard } from "@/components/operator/OperatorMetricCard";
import { OperatorCostModelCard } from "@/components/operator/OperatorCostModelCard";
import {
  OperatorInternalBanner,
  OperatorPageError,
  OperatorPageHeader,
  OperatorPageShell,
  OPERATOR_CARD_CLASS,
} from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useOperatorClubs } from "@/hooks/use-operator-clubs";
import { useOperatorOverview } from "@/hooks/use-operator-overview";
import { usePlatformCatalog } from "@/hooks/use-platform-catalog";
import { OperatorChartCard } from "@/components/operator/charts/OperatorChartCard";
import { InvestmentTimelineChart } from "@/components/operator/charts/InvestmentTimelineChart";
import { CostBreakdownPie } from "@/components/operator/charts/CostBreakdownPie";
import { RevenueByPlanBar } from "@/components/operator/charts/RevenueByPlanBar";
import {
  DEFAULT_COST_MODEL,
  appendCostModelChange,
  buildInvestmentTimeline,
  computeCosts,
  computeDevelopmentCost,
  computeInvestmentSummary,
  computeProfitability,
  computeRevenue,
  createCostModelSnapshot,
  formatEur,
  formatPercent,
  isCostModelSnapshotDirty,
  loadCostModelHistory,
  loadCostModelSnapshot,
  saveCostModelSnapshot,
  type CostModel,
  type CostModelChangeLogEntry,
  type CostModelSnapshot,
} from "@/lib/operator-financials";
import { formatOverviewTimestamp } from "@/lib/operator-formatters";

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat().format(Math.round(value));
}

export default function OperatorFinancials() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const f = t.operator.financials;
  const mi = f.metricInfo;
  const shell = t.operator.shell;

  const { data: overview, isLoading: overviewLoading, isError: overviewError, error } = useOperatorOverview();
  const { data: clubs = [], isLoading: clubsLoading } = useOperatorClubs();
  const { plans, isLoading: catalogLoading } = usePlatformCatalog();

  const [savedSnapshot, setSavedSnapshot] = useState<CostModelSnapshot>(() => loadCostModelSnapshot());
  const [draftModel, setDraftModel] = useState<CostModel>(() => savedSnapshot.model);
  const [draftComment, setDraftComment] = useState(() => savedSnapshot.comment);
  const [changeHistory, setChangeHistory] = useState<CostModelChangeLogEntry[]>(() => loadCostModelHistory());

  const isDirty = useMemo(
    () => isCostModelSnapshotDirty(draftModel, draftComment, savedSnapshot),
    [draftModel, draftComment, savedSnapshot],
  );

  function handleSaveCostModel() {
    const snapshot = createCostModelSnapshot(draftModel, draftComment);
    try {
      saveCostModelSnapshot(snapshot);
      const history = appendCostModelChange({
        savedAt: snapshot.savedAt!,
        comment: snapshot.comment,
        model: snapshot.model,
      });
      setSavedSnapshot(snapshot);
      setDraftModel(snapshot.model);
      setDraftComment(snapshot.comment);
      setChangeHistory(history);
      toast({ title: f.costModelSaved });
    } catch {
      toast({ title: f.costModelSaveFailed, variant: "destructive" });
    }
  }

  function handleResetCostModel() {
    setDraftModel(DEFAULT_COST_MODEL);
    setDraftComment("");
  }

  const isLoading = overviewLoading || clubsLoading || catalogLoading;

  const revenue = useMemo(() => computeRevenue(plans, clubs), [plans, clubs]);

  const metrics = overview?.metrics;
  const activeClubs = metrics?.active_clubs ?? 0;
  const activeUsers = metrics?.total_users ?? 0;

  const costs = useMemo(
    () => computeCosts(draftModel, { activeClubs, activeUsers, mrr: revenue.mrr }),
    [draftModel, activeClubs, activeUsers, revenue.mrr],
  );

  const profitability = useMemo(
    () => computeProfitability(revenue, costs, activeClubs),
    [revenue, costs, activeClubs],
  );

  const costLineLabels = useMemo(
    () =>
      Object.fromEntries(
        (Object.entries(t.operator.financials.costLines) as [keyof typeof t.operator.financials.costLines, string][]).map(
          ([key, label]) => [key, label],
        ),
      ) as Record<string, string>,
    [t],
  );

  const investmentTimeline = useMemo(
    () => buildInvestmentTimeline(draftModel, clubs, plans, { startMonth: "2025-01" }),
    [draftModel, clubs, plans],
  );
  const investmentSummary = useMemo(() => computeInvestmentSummary(investmentTimeline), [investmentTimeline]);
  const developmentCost = useMemo(() => computeDevelopmentCost(draftModel), [draftModel]);

  const fixedCostSlices = useMemo(() => {
    // Distinct, high-contrast categorical palette that stays legible on a dark card.
    const palette = [
      "hsl(var(--primary))",
      "#10b981",
      "#3b82f6",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#fb923c",
      "#60a5fa",
      "#a3e635",
      "#f43f5e",
      "#22d3ee",
    ];

    return costs.lines
      .filter((line) => line.kind === "fixed" && line.amount > 0)
      .map((line, index) => ({
        key: line.key,
        label: costLineLabels[line.key] ?? line.label,
        value: line.amount,
        color: palette[index % palette.length],
      }));
  }, [costs.lines, costLineLabels]);

  const revenueBars = useMemo(
    () =>
      revenue.byPlan
        .filter((row) => row.mrr > 0 || row.trialClubs > 0)
        .map((row) => ({
          planKey: row.planKey,
          planName: row.planName,
          mrr: row.mrr,
          trialMrr: row.trialClubs * row.priceMonthly,
        }))
        .sort((a, b) => b.mrr + b.trialMrr - (a.mrr + a.trialMrr)),
    [revenue.byPlan],
  );

  if (overviewError) {
    return (
      <OperatorPageError
        title={f.loadErrorTitle}
        message={error instanceof Error ? error.message : f.loadErrorMessage}
      />
    );
  }

  const netPositive = profitability.netMonthly >= 0;

  return (
    <OperatorPageShell>
      <OperatorPageHeader
        icon={LineChart}
        title={f.title}
        description={f.description}
        meta={
          isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {shell.updated} {formatOverviewTimestamp(overview?.generated_at)}
            </span>
          )
        }
      />

      <OperatorInternalBanner>{f.banner}</OperatorInternalBanner>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{f.revenue}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard label={f.mrr} value={formatEur(revenue.mrr)} hint={f.mrrHint} info={mi.mrr} icon={Euro} tone="success" isLoading={isLoading} />
          <OperatorMetricCard label={f.arr} value={formatEur(revenue.arr)} hint={f.arrHint} info={mi.arr} icon={TrendingUp} isLoading={isLoading} />
          <OperatorMetricCard
            label={f.payingClubs}
            value={revenue.payingClubs}
            hint={f.trialOnTrial.replace("{count}", String(revenue.trialClubs))}
            info={mi.payingClubs}
            icon={Wallet}
            isLoading={isLoading}
          />
          <OperatorMetricCard label={f.arpu} value={formatEur(revenue.arpu)} hint={f.arpuHint} info={mi.arpu} icon={Coins} isLoading={isLoading} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{f.profitability}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard
            label={f.monthlyCost}
            value={formatEur(costs.total)}
            hint={f.monthlyCostHint
              .replace("{fixed}", formatEur(costs.fixed))
              .replace("{variable}", formatEur(costs.variable + costs.paymentProcessing))}
            info={mi.monthlyCost}
            icon={ReceiptEuro}
            tone="warning"
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.netMonthly}
            value={formatEur(profitability.netMonthly)}
            hint={netPositive ? f.profitAfterCosts : f.operatingAtLoss}
            info={mi.netMonthly}
            icon={netPositive ? TrendingUp : TrendingDown}
            tone={netPositive ? "success" : "danger"}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.margin}
            value={formatPercent(profitability.marginPct)}
            hint={f.marginHint}
            info={mi.margin}
            icon={PiggyBank}
            tone={netPositive ? "success" : "danger"}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.breakEvenClubs}
            value={profitability.breakEvenClubs ?? "—"}
            hint={f.breakEvenHint}
            info={mi.breakEvenClubs}
            icon={Building}
            isLoading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{f.investmentSectionTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OperatorMetricCard
            label={f.developmentBuildCost}
            value={formatEur(developmentCost.total)}
            hint={
              developmentCost.method === "effort"
                ? f.developmentBuildCostEffortHint
                    .replace("{days}", formatCount(developmentCost.personDays))
                    .replace("{rate}", formatEur(developmentCost.dailyRate))
                : f.developmentBuildCostLocHint
                    .replace("{loc}", formatCount(developmentCost.linesOfCode))
                    .replace("{rate}", formatEur(developmentCost.costPerLine, 2))
            }
            info={mi.developmentBuildCost}
            icon={Code2}
            tone="warning"
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.linesOfCode}
            value={formatCount(developmentCost.linesOfCode)}
            hint={f.linesOfCodeHint.replace("{rate}", formatEur(developmentCost.costPerLine, 2))}
            info={mi.linesOfCode}
            icon={TerminalSquare}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.developmentEffort}
            value={f.developmentEffortValue.replace("{days}", formatCount(developmentCost.personDays))}
            hint={f.developmentEffortHint.replace("{rate}", formatEur(developmentCost.dailyRate))}
            info={mi.developmentEffort}
            icon={Clock}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.totalInvested}
            value={formatEur(investmentSummary.totalInvested)}
            hint={f.totalInvestedHint
              .replace("{operating}", formatEur(investmentSummary.operatingInvested))
              .replace("{development}", formatEur(investmentSummary.developmentInvested))}
            info={mi.totalInvested}
            icon={ReceiptEuro}
            tone="warning"
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.operatingSpend}
            value={formatEur(investmentSummary.operatingInvested)}
            hint={f.investmentStartHint.replace("{month}", "2025-01")}
            info={mi.operatingSpend}
            icon={Wallet}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.cumulativeRevenue}
            value={formatEur(investmentSummary.cumulativeRevenue)}
            hint={f.cumulativeRevenueHint}
            info={mi.cumulativeRevenue}
            icon={Euro}
            tone="success"
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.netPosition}
            value={formatEur(investmentSummary.netPosition)}
            hint={investmentSummary.netPosition >= 0 ? f.netPositionPositive : f.netPositionNegative}
            info={mi.netPosition}
            icon={investmentSummary.netPosition >= 0 ? TrendingUp : TrendingDown}
            tone={investmentSummary.netPosition >= 0 ? "success" : "danger"}
            isLoading={isLoading}
          />
          <OperatorMetricCard
            label={f.breakEvenMonth}
            value={investmentSummary.projectedBreakEvenMonth ?? "—"}
            hint={f.breakEvenMonthHint}
            info={mi.breakEvenMonth}
            icon={Building}
            isLoading={isLoading}
          />
        </div>
        <OperatorChartCard
          title={f.investmentTimelineTitle}
          isLoading={isLoading}
          hasData={investmentTimeline.length > 1}
          emptyTitle={f.investmentTimelineEmptyTitle}
          emptyDescription={f.investmentTimelineEmptyDesc}
        >
          <InvestmentTimelineChart
            data={investmentTimeline.map((point) => ({
              month: point.month,
              cumulativeInvestment: point.cumulativeInvestment,
              cumulativeDevelopment: point.cumulativeDevelopment,
              cumulativeRevenue: point.cumulativeRevenue,
              netCumulative: point.netCumulative,
            }))}
            investmentLabel={f.investmentLabel}
            developmentLabel={f.developmentLabel}
            revenueLabel={f.revenueLabel}
            netLabel={f.netLabel}
          />
        </OperatorChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{f.revenueByPlan}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : revenue.byPlan.length === 0 ? (
              <OperatorSectionEmptyState title={f.noSubscriptionsTitle} description={f.noSubscriptionsDesc} />
            ) : (
              <>
                {revenueBars.length > 0 ? (
                  <RevenueByPlanBar
                    data={revenueBars}
                    formatter={(value) => formatEur(value)}
                    payingLabel={f.revenueChartPaying}
                    trialLabel={f.revenueChartTrial}
                  />
                ) : (
                  <OperatorSectionEmptyState title={f.revenueChartEmptyTitle} description={f.revenueChartEmptyDesc} />
                )}
                <div className="mt-4" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{f.plan}</TableHead>
                    <TableHead className="text-right">{f.price}</TableHead>
                    <TableHead className="text-right">{f.paying}</TableHead>
                    <TableHead className="text-right">{f.trial}</TableHead>
                    <TableHead className="text-right">{f.mrr}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.byPlan.map((row) => (
                    <TableRow key={row.planKey}>
                      <TableCell className="font-medium text-foreground">{row.planName}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatEur(row.priceMonthly)}</TableCell>
                      <TableCell className="text-right">{row.payingClubs}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.trialClubs}</TableCell>
                      <TableCell className="text-right font-medium">{formatEur(row.mrr)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
            {revenue.unmatchedClubs > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {f.unmatchedClubs.replace("{count}", String(revenue.unmatchedClubs))}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{f.costBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <>
                <CostBreakdownPie data={fixedCostSlices} formatter={(value) => formatEur(value)} />
                <div className="mt-4" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{f.costLine}</TableHead>
                    <TableHead>{f.type}</TableHead>
                    <TableHead className="text-right">{f.monthly}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.lines.map((line) => (
                    <TableRow key={line.key}>
                      <TableCell className="font-medium text-foreground">
                        {costLineLabels[line.key] ?? line.label}
                      </TableCell>
                      <TableCell>
                        <Badge variant={line.kind === "fixed" ? "secondary" : "outline"}>
                          {line.kind === "fixed" ? f.fixed : f.variable}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatEur(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold text-foreground">{f.total}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold text-foreground">{formatEur(costs.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <OperatorCostModelCard
        model={draftModel}
        onChange={setDraftModel}
        onReset={handleResetCostModel}
        comment={draftComment}
        onCommentChange={setDraftComment}
        onSave={handleSaveCostModel}
        isDirty={isDirty}
        lastSavedAt={savedSnapshot.savedAt}
        changeHistory={changeHistory}
        formatSavedAt={(iso) => formatOverviewTimestamp(iso)}
      />
    </OperatorPageShell>
  );
}
