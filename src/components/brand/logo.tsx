import { cn } from "@/lib/utils";

// BenchBot logo mark: a rounded brand-gradient square holding an upward
// benchmark/trend line, paired with the wordmark. Matches brand guidelines v1.0.
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[10px] bg-brand-gradient shadow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[60%] w-[60%] text-white"
        aria-hidden="true"
      >
        <path
          d="M4 16.5 9 11l3.5 3.5L20 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 6v4M20 6h-4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="16.5" r="1.6" fill="currentColor" />
        <circle cx="9" cy="11" r="1.6" fill="currentColor" />
        <circle cx="12.5" cy="14.5" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  variant = "default",
  size = "md",
}: {
  className?: string;
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
}) {
  const markSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markSize} />
      <span className={cn("font-display font-bold tracking-tight", textSize)}>
        <span className={variant === "light" ? "text-white" : "text-ink"}>Bench</span>
        <span className="text-brand">Bot</span>
      </span>
    </span>
  );
}
