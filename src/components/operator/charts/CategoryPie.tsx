import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface CategoryPieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface CategoryPieProps {
  data: CategoryPieSlice[];
  formatter?: (value: number) => string;
}

export function CategoryPie({ data, formatter }: CategoryPieProps) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const opacityFor = (label: string) => (activeLabel && activeLabel !== label ? 0.2 : 1);

  const handleLegendClick = (entry: { value?: string | number }) => {
    const label = String(entry.value ?? "");
    if (!label) return;
    setActiveLabel((prev) => (prev === label ? null : label));
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={90} paddingAngle={2}>
            {data.map((slice) => (
              <Cell key={slice.key} fill={slice.color} fillOpacity={opacityFor(slice.label)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            itemStyle={{ color: "hsl(var(--popover-foreground))" }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number, name: string) => [formatter ? formatter(value) : value, name]}
          />
          <Legend
            verticalAlign="bottom"
            onClick={handleLegendClick}
            wrapperStyle={{ cursor: "pointer", fontSize: 12, paddingTop: 8 }}
            formatter={(value: string) => (
              <span
                style={{
                  color: "hsl(var(--foreground))",
                  opacity: opacityFor(value),
                }}
              >
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
