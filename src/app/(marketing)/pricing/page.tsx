import { Badge } from "@/components/ui/badge";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { getSession } from "@/lib/auth";
import { getUsage } from "@/lib/db";

export const metadata = { title: "Pricing · BenchBot" };

export default async function PricingPage() {
  const session = await getSession();
  const currentPlan = session ? getUsage(session.workspace.id).plan : undefined;

  return (
    <div className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="brand" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Your AI website improvement platform
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Start free with 2 full audits. Upgrade when you&apos;re ready to improve continuously —
          cancel anytime. Billing is Stripe-ready (mocked in this MVP).
        </p>
      </div>

      <div className="mt-14">
        <PricingPlans authed={Boolean(session)} currentPlan={currentPlan} />
      </div>

      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        All plans include the full BenchBot report engine — UX, SEO, accessibility, performance and
        AI/GEO insights. Prices are illustrative for this MVP.
      </p>
    </div>
  );
}
