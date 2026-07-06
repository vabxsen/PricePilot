/**
 * Minimal trend line for dashboard cards — plain SVG, no axes/tooltip,
 * no charting-library overhead per card. Color comes from `currentColor`
 * so callers just set a text-* class on the wrapper.
 */
export function Sparkline({
  data,
  width = 96,
  height = 32,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div style={{ width, height }} className="grid place-items-center">
        <div className="h-px w-full bg-border/10" />
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
