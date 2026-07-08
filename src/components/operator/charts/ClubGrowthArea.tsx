import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ClubGrowthAreaPoint {
  month: string;
  totalClubs: number;
}

interface ClubGrowthAreaProps {
  data: ClubGrowthAreaPoint[];
  formatter: (value: number) => string;
}

export function ClubGrowthArea({ data, formatter }: ClubGrowthAreaProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatter(Number(v))} />
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
            formatter={(value: number) => formatter(value)}
          />
          <Area type="monotone" dataKey="totalClubs" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.14)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

