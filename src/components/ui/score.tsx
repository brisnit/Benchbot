import { cn, scoreBand } from "@/lib/utils";

const BAND_TEXT = {
  good: "text-good",
  warn: "text-[#B5740B]",
  critical: "text-critical",
} as const;

const BAND_STROKE = {
  good: "#16C098",
  warn: "#F5A524",
  critical: "#F31268",
} as const;

const BAND_BG = {
  good: "bg-good/10 text-good",
  warn: "bg-warn/15 text-[#B5740B]",
  critical: "bg-critical/10 text-critical",
} as const;

/** Small inline mono score pill, e.g. 82/100 */
export function ScorePill({ score, className }: { score: number; className?: string }) {
  const band = scoreBand(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums",
        BAND_BG[band],
        className,
      )}
    >
      {score}
    </span>
  );
}

/** Horizontal score bar with label. */
export function ScoreBar({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const band = scoreBand(score);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: BAND_STROKE[band] }}
        />
      </div>
      <span className={cn("w-9 text-right font-mono text-xs tabular-nums", BAND_TEXT[band])}>
        {score}
      </span>
    </div>
  );
}

/** Circular score ring. */
export function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const band = scoreBand(score);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E4E7EF"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={BAND_STROKE[band]}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("font-display text-2xl font-bold tabular-nums", BAND_TEXT[band])}>
          {score}
        </span>
        {label && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
