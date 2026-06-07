import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand text-white",
        secondary: "border-transparent bg-secondary text-slate-700",
        outline: "border-border text-slate-600",
        good: "border-transparent bg-good/10 text-good",
        warn: "border-transparent bg-warn/15 text-[#B5740B]",
        critical: "border-transparent bg-critical/10 text-critical",
        violet: "border-transparent bg-violet-50 text-violet",
        brand: "border-transparent bg-brand-50 text-brand",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
