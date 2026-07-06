import type { PricePoint } from "@pricepilot/shared";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PriceChart({ history, currency = "USD" }: { history: PricePoint[]; currency?: string }) {
  if (history.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-lg border border-dashed border-black/15 text-center text-sm text-black/40 dark:border-white/15 dark:text-white/40">
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
    <div className="h-64 rounded-lg border border-black/10 bg-surface p-4 dark:border-white/15">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" opacity={0.4} />
          <YAxis tick={{ fontSize: 12 }} stroke="currentColor" opacity={0.4} tickFormatter={fmt} width={64} />
          <Tooltip formatter={(value: number) => fmt(value)} />
          <Line type="monotone" dataKey="price" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
