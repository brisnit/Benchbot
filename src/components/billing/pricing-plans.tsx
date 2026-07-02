"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PLANS, priceFor, type BillingCycle, type Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export function PricingPlans({ authed, currentPlan }: { authed: boolean; currentPlan?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [busy, setBusy] = React.useState<string | null>(null);

  async function choose(plan: Plan) {
    if (plan.id === "enterprise") {
      window.location.href = "mailto:sales@benchbot.app?subject=BenchBot%20Enterprise";
      return;
    }
    if (plan.id === "guest" || !authed) {
      router.push("/signup");
      return;
    }
    if (plan.id === currentPlan) return;
    setBusy(plan.id);
    try {
      const res = await fetch("/api/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, cycle }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Couldn't change plan");
      toast({ title: `You're on ${plan.name}`, description: "Your audit allowance has been updated.", variant: "success" });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast({ title: "Couldn't change plan", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Billing cycle toggle */}
      <div className="mb-10 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", cycle === "monthly" ? "text-ink" : "text-muted-foreground")}>Monthly</span>
        <button
          onClick={() => setCycle((c) => (c === "monthly" ? "annual" : "monthly"))}
          className="relative h-6 w-11 rounded-full bg-secondary transition-colors"
          aria-label="Toggle billing cycle"
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-brand-gradient transition-transform", cycle === "annual" ? "translate-x-[22px]" : "translate-x-0.5")} />
        </button>
        <span className={cn("text-sm font-medium", cycle === "annual" ? "text-ink" : "text-muted-foreground")}>
          Annual <span className="ml-1 rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">Save 20%</span>
        </span>
      </div>

      <div className="mx-auto grid max-w-6xl items-stretch gap-5 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS.map((plan) => {
          const price = priceFor(plan, cycle);
          const isCurrent = authed && plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow",
                plan.popular
                  ? "border-brand shadow-xl ring-2 ring-brand/20 xl:-my-3 xl:scale-[1.03]"
                  : "border-border shadow-sm hover:shadow-md",
              )}
            >
              {plan.popular && (
                <Badge variant="violet" className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 whitespace-nowrap">
                  <Sparkles className="h-3 w-3" /> Most popular
                </Badge>
              )}
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                {isCurrent && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="mt-1 min-h-[40px] text-xs text-muted-foreground">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                {price === null ? (
                  <span className="font-display text-3xl font-bold">Custom</span>
                ) : (
                  <>
                    <span className="font-display text-4xl font-bold tracking-tight">${price}</span>
                    {plan.id !== "guest" && <span className="text-sm text-muted-foreground">/mo</span>}
                  </>
                )}
              </div>
              {cycle === "annual" && plan.priceMonthly ? (
                <p className="mt-1 text-xs text-muted-foreground">billed annually</p>
              ) : (
                <p className="mt-1 text-xs text-transparent">.</p>
              )}

              <button
                onClick={() => choose(plan)}
                disabled={busy === plan.id || isCurrent}
                className={cn(
                  "mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-display font-medium transition-colors disabled:opacity-60",
                  plan.popular ? "bg-brand-gradient text-white hover:opacity-95" : "border border-border text-ink hover:bg-secondary",
                )}
              >
                {busy === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCurrent ? "Current plan" : plan.cta}
                {!isCurrent && !busy && plan.popular && <ArrowRight className="h-4 w-4" />}
              </button>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                    <span className="text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!authed && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Every account starts with <strong className="text-ink">2 free audits</strong> — no credit card required.{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">Create your account →</Link>
        </p>
      )}
    </div>
  );
}
