"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PLANS, priceFor } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

// Elegant premium upgrade prompt shown when a workspace runs out of audits.
export function UpgradeModal({
  open,
  onOpenChange,
  isGuest = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isGuest?: boolean;
}) {
  const tiers = PLANS.filter((p) => p.id === "starter" || p.id === "professional" || p.id === "agency");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-3xl overflow-auto">
        <DialogHeader>
          <Badge variant="violet" className="mb-1 w-fit gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Keep improving
          </Badge>
          <DialogTitle className="text-2xl">
            {isGuest ? "You've used your free BenchBot audits" : "You've hit your monthly limit"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Continue improving your website with unlimited AI-powered insights. Pick a plan — cancel anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {tiers.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-4",
                plan.popular ? "border-brand ring-2 ring-brand/20 shadow-lg" : "border-border",
              )}
            >
              {plan.popular && (
                <Badge variant="violet" className="absolute -top-2.5 left-4 gap-1">
                  <Sparkles className="h-3 w-3" /> Most popular
                </Badge>
              )}
              <p className="font-display text-base font-bold">{plan.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">${priceFor(plan, "monthly")}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.audits} audits / month</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className={cn(
                  "mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-display font-medium transition-colors",
                  plan.popular ? "bg-brand-gradient text-white hover:opacity-95" : "border border-border text-ink hover:bg-secondary",
                )}
              >
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          <Link href="/pricing" className="font-medium text-brand hover:underline">
            Compare all plans →
          </Link>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-ink">
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
