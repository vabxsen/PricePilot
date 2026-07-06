import type { PricePoint } from "@pricepilot/shared";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../lib/format.js";

/**
 * SteamDB-style price-history chart: smooth cyan line with a soft gradient
 * fill, a dashed target-price reference line, and a themed tooltip. Reads
 * whatever real `PricePoint[]` history it's given (from Firebase) — no
 * placeholder data — and renders an empty state when the selected range has
 * none yet. Intentionally separate from the smaller `PriceChart` used on the
 * product detail page.
 */
export function PriceHistoryChart({
  history,
  currency = "USD",
  targetPrice,
}: {
  history: PricePoint[];
  currency?: string;
  targetPrice?: number | null;
}) {
  if (history.length === 0) {
    return (
      <div className="grid h-72 place-items-center rounded-lg border border-dashed border-border/15 bg-surface/40 px-6 text-center text-sm text-ink-faint">
        No price history in this range yet — data appears as prices are recorded.
      </div>
    );
  }

  const data = history.map((p) => ({ ts: p.ts, price: p.price }));
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = (max - min) * 0.15 || max * 0.1 || 1;

  const spanDays = (data[data.length - 1]!.ts - data[0]!.ts) / 86_400_000;
  const axisDateFmt = (ts: number) =>
    new Date(ts).toLocaleDateString(
      "en-US",
      spanDays > 300 ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" },
    );
  const fullDateFmt = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const axisMoneyFmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(v);

  return (
    <div className="h-72 rounded-lg border border-border/10 bg-surface p-3 sm:p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pp-price-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#02FEE4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#02FEE4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#ffffff12" />
          <XAxis
            dataKey="ts"
            tickFormatter={axisDateFmt}
            tick={{ fontSize: 11, fill: "#9e9e9e" }}
            stroke="#ffffff1a"
            minTickGap={40}
          />
          <YAxis
            domain={[Math.max(0, min - pad), max + pad]}
            tickFormatter={axisMoneyFmt}
            tick={{ fontSize: 11, fill: "#9e9e9e" }}
            stroke="#ffffff1a"
            width={52}
          />
          {targetPrice != null && (
            <ReferenceLine
              y={targetPrice}
              stroke="#02FEE4"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: "Target", position: "insideTopRight", fill: "#02FEE4", fontSize: 11 }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "#ffffff33", strokeWidth: 1 }}
            content={(props: {
              active?: boolean;
              payload?: { payload: { ts: number; price: number } }[];
            }) => {
              const { active, payload } = props;
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0]!.payload;
              return (
                <div className="rounded-md border border-border/10 bg-surface-raised px-3 py-2 shadow-lg">
                  <div className="text-xs text-ink-faint">{fullDateFmt(point.ts)}</div>
                  <div className="tabular mt-0.5 text-sm font-semibold text-brand">
                    {formatMoney(point.price, currency)}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#02FEE4"
            strokeWidth={2}
            fill="url(#pp-price-grad)"
            dot={false}
            activeDot={{ r: 4, fill: "#02FEE4", stroke: "#020202", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
