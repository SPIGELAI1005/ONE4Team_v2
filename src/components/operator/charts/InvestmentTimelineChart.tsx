import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/operator-financials";

export interface InvestmentTimelineChartPoint {
  month: string;
  cumulativeInvestment: number;
  cumulativeDevelopment: number;
  cumulativeRevenue: number;
  netCumulative: number;
}

interface InvestmentTimelineChartProps {
  data: InvestmentTimelineChartPoint[];
  investmentLabel: string;
  developmentLabel: string;
  revenueLabel: string;
  netLabel: string;
  seriesToggleLabel: string;
}

const KEY_INVESTMENT = "cumulativeInvestment";
const KEY_DEVELOPMENT = "cumulativeDevelopment";
const KEY_REVENUE = "cumulativeRevenue";
const KEY_NET = "netCumulative";

const COLOR_INVESTMENT = "hsl(var(--primary))";
const COLOR_DEVELOPMENT = "#8b5cf6";
const COLOR_REVENUE = "#10b981";
const COLOR_NET_POSITIVE = "#10b981";
const COLOR_NET_NEGATIVE = "#ef4444";

export function InvestmentTimelineChart({
  data,
  investmentLabel,
  developmentLabel,
  revenueLabel,
  netLabel,
  seriesToggleLabel,
}: InvestmentTimelineChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const gradientId = useMemo(() => `net-gradient-${Math.random().toString(36).slice(2)}`, []);

  const isVisible = (key: string) => !hidden.has(key);
  const investmentVisible = isVisible(KEY_INVESTMENT);
  const developmentVisible = isVisible(KEY_DEVELOPMENT);

  // Net recomputes from the currently shown cost lines: revenue always counts as
  // income, but operating spend and development are only subtracted when their
  // lines are visible. Hiding development therefore makes net = revenue - operating.
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        netCumulative:
          point.cumulativeRevenue -
          (investmentVisible ? point.cumulativeInvestment : 0) -
          (developmentVisible ? point.cumulativeDevelopment : 0),
      })),
    [data, investmentVisible, developmentVisible],
  );

  // Fraction (0..1) from the top of the net line's bounding box where value 0 sits,
  // so the stroke gradient can be emerald above the zero line and red below it.
  const zeroOffset = useMemo(() => {
    const values = chartData.map((point) => point.netCumulative);
    if (values.length === 0) return 0.5;
    const maxV = Math.max(...values);
    const minV = Math.min(...values);
    const span = maxV - minV;
    if (span === 0) return maxV >= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, maxV / span));
  }, [chartData]);

  const opacityFor = (key: string) => (activeKey && activeKey !== key ? 0.12 : 1);

  const handleLegendClick = (entry: { dataKey?: string | number }) => {
    const key = String(entry.dataKey ?? "");
    if (!key) return;
    setActiveKey((prev) => (prev === key ? null : key));
  };

  const toggleVisible = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActiveKey((prev) => (prev === key ? null : prev));
  };

  const series = [
    { key: KEY_INVESTMENT, label: investmentLabel, color: COLOR_INVESTMENT },
    { key: KEY_DEVELOPMENT, label: developmentLabel, color: COLOR_DEVELOPMENT },
    { key: KEY_REVENUE, label: revenueLabel, color: COLOR_REVENUE },
    { key: KEY_NET, label: netLabel, color: COLOR_NET_NEGATIVE },
  ];

  const legendPayload = series
    .filter((item) => isVisible(item.key))
    .map((item) => ({ value: item.label, type: "line" as const, id: item.key, dataKey: item.key, color: item.color }));

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{seriesToggleLabel}</span>
        {series.map((item) => {
          const shown = isVisible(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleVisible(item.key)}
              aria-pressed={shown}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                shown
                  ? "border-border bg-muted/40 text-foreground hover:bg-muted/60"
                  : "border-border/50 text-muted-foreground line-through opacity-70 hover:opacity-100",
              )}
            >
              {shown ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span className="h-2 w-2 rounded-full" style={{ background: item.color, opacity: shown ? 1 : 0.4 }} />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor={COLOR_NET_POSITIVE} />
                <stop offset={zeroOffset} stopColor={COLOR_NET_POSITIVE} />
                <stop offset={zeroOffset} stopColor={COLOR_NET_NEGATIVE} />
                <stop offset={1} stopColor={COLOR_NET_NEGATIVE} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={64}
              domain={[(dataMin: number) => Math.min(0, dataMin), (dataMax: number) => Math.max(0, dataMax)]}
              tickFormatter={(v) => formatEur(Number(v), 0)}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground) / 0.4)" }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              itemStyle={{ color: "hsl(var(--popover-foreground))" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: number, name: string) => [formatEur(value, 0), name]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
            <Legend
              verticalAlign="bottom"
              onClick={handleLegendClick}
              payload={legendPayload}
              wrapperStyle={{ cursor: "pointer", fontSize: 12, paddingTop: 10 }}
              formatter={(value: string, entry) => {
                const key = String((entry as { dataKey?: string }).dataKey ?? "");
                return (
                  <span
                    style={{
                      color: "hsl(var(--foreground))",
                      opacity: activeKey && activeKey !== key ? 0.4 : 1,
                    }}
                  >
                    {value}
                  </span>
                );
              }}
            />
            {investmentVisible ? (
              <Area
                type="monotone"
                dataKey={KEY_INVESTMENT}
                name={investmentLabel}
                stroke={COLOR_INVESTMENT}
                fill={COLOR_INVESTMENT}
                fillOpacity={0.1 * opacityFor(KEY_INVESTMENT)}
                strokeOpacity={opacityFor(KEY_INVESTMENT)}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ) : null}
            {developmentVisible ? (
              <Area
                type="monotone"
                dataKey={KEY_DEVELOPMENT}
                name={developmentLabel}
                stroke={COLOR_DEVELOPMENT}
                fill={COLOR_DEVELOPMENT}
                fillOpacity={0.08 * opacityFor(KEY_DEVELOPMENT)}
                strokeOpacity={opacityFor(KEY_DEVELOPMENT)}
                strokeWidth={2}
                strokeDasharray="5 3"
                isAnimationActive={false}
              />
            ) : null}
            {isVisible(KEY_REVENUE) ? (
              <Area
                type="monotone"
                dataKey={KEY_REVENUE}
                name={revenueLabel}
                stroke={COLOR_REVENUE}
                fill={COLOR_REVENUE}
                fillOpacity={0.1 * opacityFor(KEY_REVENUE)}
                strokeOpacity={opacityFor(KEY_REVENUE)}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ) : null}
            {isVisible(KEY_NET) ? (
              <Line
                type="monotone"
                dataKey={KEY_NET}
                name={netLabel}
                stroke={`url(#${gradientId})`}
                strokeWidth={3}
                dot={false}
                strokeOpacity={opacityFor(KEY_NET)}
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
