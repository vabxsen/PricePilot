/** Currency formatter that never throws on an unknown/blank currency code. */
export function formatMoney(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Compact "3 days ago" style relative time. */
export function timeAgo(ts: number): string {
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  const secs = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(secs);
  if (abs < 60) return rtf.format(Math.round(secs), "second");
  if (abs < 3600) return rtf.format(Math.round(secs / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(secs / 86400), "day");
  if (abs < 2629800) return rtf.format(Math.round(secs / 604800), "week");
  if (abs < 31557600) return rtf.format(Math.round(secs / 2629800), "month");
  return rtf.format(Math.round(secs / 31557600), "year");
}
