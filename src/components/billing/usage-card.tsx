import Link from "next/link";
import { Sparkles, Infinity as InfinityIcon, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlan } from "@/lib/billing/plans";
import { formatDate, cn } from "@/lib/utils";
import type { Usage } from "@/lib/db";

// Elegant plan + usage summary for the dashboard.
export function UsageCard({ usage, className }: { usage: Usage; className?: string }) {
  const plan = getPlan(usage.plan);
  const pct = usage.unlimited ? 100 : Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const low = !usage.unlimited && usage.remaining <= (usage.isGuest ? 1 : Math.max(2, usage.limit * 0.1));

  return (
    <Card className={cn("flex flex-col p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Your plan</span>
          <Badge variant={plan.popular ? "violet" : plan.id === "guest" ? "secondary" : "brand"} className="capitalize">
            {plan.name}
          </Badge>
        </div>
        {usage.unlimited && <InfinityIcon className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="mt-4">
        {usage.unlimited ? (
          <p className="font-display text-2xl font-bold">Unlimited audits</p>
        ) : (
          <p className="font-display text-2xl font-bold tabular-nums">
            {usage.used}
            <span className="text-muted-foreground"> / {usage.limit}</span>
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              {usage.isGuest ? "free audits used" : "audits this month"}
            </span>
          </p>
        )}

        {!usage.unlimited && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", low ? "bg-critical" : "bg-brand-gradient")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          {usage.unlimited
            ? "Enterprise — no limits."
            : usage.remaining > 0
              ? `${usage.remaining} remaining${usage.renewsAt ? ` · renews ${formatDate(usage.renewsAt)}` : usage.isGuest ? "" : ""}`
              : usage.isGuest
                ? "You've used your free audits."
                : "Monthly limit reached."}
        </p>
      </div>

      {plan.id !== "enterprise" && (
        <Link
          href="/pricing"
          className={cn(
            "mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-display font-medium transition-colors",
            low || usage.remaining <= 0
              ? "bg-brand-gradient text-white hover:opacity-95"
              : "border border-border text-ink hover:bg-secondary",
          )}
        >
          <Sparkles className="h-4 w-4" />
          {usage.isGuest ? "Upgrade for more audits" : "Change plan"}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}
