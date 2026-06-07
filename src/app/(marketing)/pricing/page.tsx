import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/ month",
    description: "Run your first audits and explore the full report.",
    cta: "Start free",
    href: "/signup",
    highlighted: false,
    features: [
      "2 audits per month",
      "Up to 3 competitors",
      "Desktop screenshots",
      "Heuristic UX scoring",
      "Markdown report export",
    ],
  },
  {
    name: "Agency",
    price: "$149",
    cadence: "/ month",
    description: "For studios and teams running audits for clients.",
    cta: "Start 14-day trial",
    href: "/signup",
    highlighted: true,
    features: [
      "Unlimited audits",
      "Up to 10 competitors",
      "Desktop + mobile capture",
      "Content & GEO gap analysis",
      "Saved competitor sets",
      "PDF & PowerPoint export",
      "Workspace collaboration",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "Security, SSO and volume for larger organisations.",
    cta: "Talk to sales",
    href: "/signup",
    highlighted: false,
    features: [
      "Everything in Agency",
      "SSO / SAML",
      "Custom heuristics",
      "API access",
      "Dedicated support",
      "Audit history retention",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="brand" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Simple pricing that scales with you</h1>
        <p className="mt-4 text-lg text-slate-600">
          Start free. Upgrade when you&apos;re running audits for clients. Billing is Stripe-ready —
          stubbed for this MVP.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm",
              tier.highlighted
                ? "border-brand ring-2 ring-brand/20 shadow-lg"
                : "border-border",
            )}
          >
            {tier.highlighted && (
              <Badge variant="violet" className="absolute -top-3 left-7 gap-1">
                <Sparkles className="h-3 w-3" /> Most popular
              </Badge>
            )}
            <h3 className="text-lg font-semibold">{tier.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold tracking-tight">{tier.price}</span>
              <span className="text-sm text-muted-foreground">{tier.cadence}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
            <Button
              asChild
              variant={tier.highlighted ? "gradient" : "secondary"}
              className="mt-6 w-full"
            >
              <Link href={tier.href}>{tier.cta}</Link>
            </Button>
            <ul className="mt-7 space-y-3">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                  <span className="text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        All plans include the full BenchBot report engine. Prices shown are illustrative for this MVP.
      </p>
    </div>
  );
}
