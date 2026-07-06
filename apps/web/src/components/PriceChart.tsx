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

  const fmt = (v: number | string | undefined) =>
    typeof v === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v)
      : "";

  return (
    <div className="h-64 rounded-lg border border-border/10 bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9e9e9e" }} stroke="#ffffff1a" />
          <YAxis
            tick={{ fontSize: 12, fill: "#9e9e9e" }}
            stroke="#ffffff1a"
            tickFormatter={(v: number) => fmt(v)}
            width={64}
          />
          <Tooltip
            formatter={(value) => fmt(value as number)}
            contentStyle={{
              background: "#121212",
              border: "1px solid #ffffff1a",
              borderRadius: 8,
              color: "#f5f5f5",
            }}
            labelStyle={{ color: "#9e9e9e" }}
            itemStyle={{ color: "#02FEE4" }}
          />
          <Line type="monotone" dataKey="price" stroke="#02FEE4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
