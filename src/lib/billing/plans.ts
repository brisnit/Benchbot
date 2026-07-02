// BenchBot plans & monetization model. Single source of truth for pricing,
// limits and feature lists — used by the pricing page, upgrade modal, usage
// card, billing settings and server-side enforcement.

export type PlanId = "guest" | "starter" | "professional" | "agency" | "enterprise";
export type BillingCycle = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in USD. null = custom (Enterprise). */
  priceMonthly: number | null;
  /** Effective per-month price when billed annually (≈20% off). */
  priceAnnual: number | null;
  /** Audit allowance. Guest is a lifetime allowance; paid plans reset monthly. */
  audits: number; // Infinity for enterprise
  guest?: boolean;
  popular?: boolean;
  cta: string;
  features: string[];
}

export const ANNUAL_DISCOUNT = 0.2;

export const PLANS: Plan[] = [
  {
    id: "guest",
    name: "Guest",
    tagline: "Fall in love with BenchBot — no card required.",
    priceMonthly: 0,
    priceAnnual: 0,
    audits: 2,
    guest: true,
    cta: "Start free",
    features: [
      "2 complete website audits",
      "Full AI analysis",
      "UX, SEO, accessibility & performance review",
      "Complete score breakdown",
      "Beautiful report + PDF preview",
      "No credit card required",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For individuals improving one site.",
    priceMonthly: 19,
    priceAnnual: 15,
    audits: 10,
    cta: "Upgrade",
    features: ["10 website audits / month", "Saved reports", "PDF exports", "Audit history", "Email support"],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For teams who improve continuously.",
    priceMonthly: 49,
    priceAnnual: 39,
    audits: 50,
    popular: true,
    cta: "Start Professional",
    features: [
      "50 website audits / month",
      "Unlimited saved reports",
      "Competitor benchmarking",
      "Advanced AI recommendations",
      "Priority processing",
      "Premium dashboard",
      "Progress tracking",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For studios running audits for clients.",
    priceMonthly: 99,
    priceAnnual: 79,
    audits: 200,
    cta: "Choose Agency",
    features: [
      "200 website audits / month",
      "Team members",
      "White-label reports",
      "Client workspaces",
      "Automated weekly reports",
      "Team dashboard",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For organisations with scale & security needs.",
    priceMonthly: null,
    priceAnnual: null,
    audits: Infinity,
    cta: "Contact sales",
    features: [
      "Unlimited usage",
      "API access",
      "Dedicated infrastructure",
      "Custom AI models",
      "Custom branding",
      "Priority engineering support",
    ],
  },
];

export function getPlan(id: string | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function auditLimit(planId: string | undefined): number {
  return getPlan(planId).audits;
}

export function priceFor(plan: Plan, cycle: BillingCycle): number | null {
  return cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
}
