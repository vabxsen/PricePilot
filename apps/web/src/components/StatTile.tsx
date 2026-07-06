import { Card } from "./ui/Card.js";

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold text-ink">{value}</div>
    </Card>
  );
}
