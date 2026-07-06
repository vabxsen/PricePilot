import type { PricePoint } from "@pricepilot/shared";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PriceChart({ history, currency = "USD" }: { history: PricePoint[]; currency?: string }) {
  if (history.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-lg border border-dashed border-border/15 text-center text-sm text-ink-faint">
        No price history yet — check back after the next scan.
      </div>
    );
  }

  const data = history.map((p) => ({
    date: new Date(p.ts).toLocaleDateString(),
    price: p.price,
  }));

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="h-64 rounded-lg border border-border/10 bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "hsl(0 0% 62%)" }}
            stroke="hsl(0 0% 100% / 0.1)"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "hsl(0 0% 62%)" }}
            stroke="hsl(0 0% 100% / 0.1)"
            tickFormatter={fmt}
            width={64}
          />
          <Tooltip
            formatter={(value: number) => fmt(value)}
            contentStyle={{
              background: "hsl(0 0% 7%)",
              border: "1px solid hsl(0 0% 100% / 0.1)",
              borderRadius: 8,
              color: "hsl(0 0% 96%)",
            }}
            labelStyle={{ color: "hsl(0 0% 62%)" }}
            itemStyle={{ color: "hsl(9 100% 50%)" }}
          />
          <Line type="monotone" dataKey="price" stroke="hsl(9 100% 50%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
