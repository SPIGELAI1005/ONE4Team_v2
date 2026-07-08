import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RevenueByPlanBarPoint {
  planKey: string;
  planName: string;
  mrr: number;
  trialMrr: number;
}

interface RevenueByPlanBarProps {
  data: RevenueByPlanBarPoint[];
  formatter: (value: number) => string;
  payingLabel: string;
  trialLabel: string;
}

const COLOR_PAYING = "hsl(var(--primary))";
const COLOR_TRIAL = "#10b981";

export function RevenueByPlanBar({ data, formatter, payingLabel, trialLabel }: RevenueByPlanBarProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const opacityFor = (key: string) => (activeKey && activeKey !== key ? 0.15 : 1);

  const handleLegendClick = (entry: { dataKey?: string | number }) => {
    const key = String(entry.dataKey ?? "");
    if (!key) return;
    setActiveKey((prev) => (prev === key ? null : key));
  };

  const legendPayload = [
    { value: payingLabel, type: "square" as const, id: "mrr", dataKey: "mrr", color: COLOR_PAYING },
    { value: trialLabel, type: "square" as const, id: "trialMrr", dataKey: "trialMrr", color: COLOR_TRIAL },
  ];

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="planName"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-10}
            height={50}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v) => formatter(Number(v))}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            itemStyle={{ color: "hsl(var(--popover-foreground))" }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number, name: string) => [formatter(value), name]}
          />
          <Legend
            verticalAlign="bottom"
            onClick={handleLegendClick}
            payload={legendPayload}
            wrapperStyle={{ cursor: "pointer", fontSize: 12, paddingTop: 8 }}
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
          <Bar
            dataKey="mrr"
            name={payingLabel}
            stackId="plan"
            fill={COLOR_PAYING}
            fillOpacity={opacityFor("mrr")}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="trialMrr"
            name={trialLabel}
            stackId="plan"
            fill={COLOR_TRIAL}
            fillOpacity={0.85 * opacityFor("trialMrr")}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
