import { useMemo, useState } from "react";
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
}

const COLOR_INVESTMENT = "hsl(var(--primary))";
const COLOR_DEVELOPMENT = "#8b5cf6";
const COLOR_REVENUE = "#10b981";
const COLOR_NET_POSITIVE = "#10b981";
const COLOR_NET_NEGATIVE = "#ef4444";

export function InvestmentTimelineChart({ data, investmentLabel, developmentLabel, revenueLabel, netLabel }: InvestmentTimelineChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const gradientId = useMemo(() => `net-gradient-${Math.random().toString(36).slice(2)}`, []);

  // Fraction (0..1) from the top of the net line's bounding box where value 0 sits,
  // so the stroke gradient can be emerald above the zero line and red below it.
  const zeroOffset = useMemo(() => {
    const values = data.map((point) => point.netCumulative);
    if (values.length === 0) return 0.5;
    const maxV = Math.max(...values);
    const minV = Math.min(...values);
    const span = maxV - minV;
    if (span === 0) return maxV >= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, maxV / span));
  }, [data]);

  const opacityFor = (key: string) => (activeKey && activeKey !== key ? 0.12 : 1);

  const handleLegendClick = (entry: { dataKey?: string | number }) => {
    const key = String(entry.dataKey ?? "");
    if (!key) return;
    setActiveKey((prev) => (prev === key ? null : key));
  };

  const legendPayload = [
    { value: investmentLabel, type: "line" as const, id: "cumulativeInvestment", dataKey: "cumulativeInvestment", color: COLOR_INVESTMENT },
    { value: developmentLabel, type: "line" as const, id: "cumulativeDevelopment", dataKey: "cumulativeDevelopment", color: COLOR_DEVELOPMENT },
    { value: revenueLabel, type: "line" as const, id: "cumulativeRevenue", dataKey: "cumulativeRevenue", color: COLOR_REVENUE },
    { value: netLabel, type: "line" as const, id: "netCumulative", dataKey: "netCumulative", color: COLOR_NET_NEGATIVE },
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
          <Area
            type="monotone"
            dataKey="cumulativeInvestment"
            name={investmentLabel}
            stroke={COLOR_INVESTMENT}
            fill={COLOR_INVESTMENT}
            fillOpacity={0.1 * opacityFor("cumulativeInvestment")}
            strokeOpacity={opacityFor("cumulativeInvestment")}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="cumulativeDevelopment"
            name={developmentLabel}
            stroke={COLOR_DEVELOPMENT}
            fill={COLOR_DEVELOPMENT}
            fillOpacity={0.08 * opacityFor("cumulativeDevelopment")}
            strokeOpacity={opacityFor("cumulativeDevelopment")}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <Area
            type="monotone"
            dataKey="cumulativeRevenue"
            name={revenueLabel}
            stroke={COLOR_REVENUE}
            fill={COLOR_REVENUE}
            fillOpacity={0.1 * opacityFor("cumulativeRevenue")}
            strokeOpacity={opacityFor("cumulativeRevenue")}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="netCumulative"
            name={netLabel}
            stroke={`url(#${gradientId})`}
            strokeWidth={3}
            dot={false}
            strokeOpacity={opacityFor("netCumulative")}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
