import { cn } from "@/lib/utils";

// Dependency-free SVG charts for score-over-time views.

export function Sparkline({
  values,
  color = "#3552E6",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const w = 100;
  const h = 28;
  if (values.length === 0) return null;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-8 w-full", className)}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {values.length === 1 && <circle cx={w / 2} cy={h - ((values[0] - min) / range) * h} r={2.5} fill={color} />}
    </svg>
  );
}

export interface Series {
  name: string;
  color: string;
  values: number[];
}

export function ProgressChart({
  labels,
  series,
  height = 260,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  const W = 760;
  const H = height;
  const padL = 34;
  const padR = 16;
  const padT = 14;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = labels.length;

  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / 100) * plotH;

  const gridY = [0, 25, 50, 75, 100];

  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px]" style={{ width: "100%" }}>
        {/* gridlines */}
        {gridY.map((g) => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#E4E7EF" strokeWidth={1} />
            <text x={padL - 8} y={y(g) + 3} textAnchor="end" fontSize={10} fill="#94A3B8" fontFamily="monospace">{g}</text>
          </g>
        ))}
        {/* x labels */}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 12} textAnchor="middle" fontSize={10} fill="#647488">{l}</text>
        ))}
        {/* series */}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="#fff" stroke={s.color} strokeWidth={2} />
            ))}
          </g>
        ))}
      </svg>
      {/* legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
