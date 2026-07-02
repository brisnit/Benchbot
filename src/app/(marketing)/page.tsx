import Link from "next/link";
import {
  ArrowRight,
  Camera,
  FileText,
  Gauge,
  GitBranch,
  Layers,
  Search,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AUDIT_PIPELINE } from "@/lib/constants";

const FEATURES = [
  {
    icon: Target,
    title: "AI competitor discovery",
    body: "Drop in a URL and BenchBot proposes direct, indirect and best-in-class competitors — grouped and ranked.",
  },
  {
    icon: Camera,
    title: "Automated screenshots",
    body: "Desktop and mobile captures of homepages, navigation, product, forms and CTAs — organised in a filterable library.",
  },
  {
    icon: Gauge,
    title: "Heuristic UX scoring",
    body: "Ten usability heuristics scored with evidence and a concrete recommendation for every finding.",
  },
  {
    icon: GitBranch,
    title: "Visual sitemaps & IA",
    body: "Tree-view sitemaps with depth, duplicate sections and missing pages — compared across the competitive set.",
  },
  {
    icon: Search,
    title: "Content & GEO gaps",
    body: "See the topics competitors cover that you don't, plus AI-visibility wins: schema, metadata and LLM-readiness.",
  },
  {
    icon: FileText,
    title: "Client-ready report",
    body: "One polished, exportable report: executive summary, matrix, findings and next steps. Copy or hand off in a click.",
  },
];

const STEPS = [
  { n: "01", title: "Enter a URL", body: "Add your site, pick a type and an audit goal." },
  { n: "02", title: "Choose competitors", body: "Accept AI suggestions or add your own — up to 10." },
  { n: "03", title: "Run the audit", body: "BenchBot crawls, captures and scores in minutes." },
  { n: "04", title: "Share the report", body: "Review the dashboard and export a client-ready deck." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,92,252,0.12),transparent),radial-gradient(40%_40%_at_80%_10%,rgba(53,82,230,0.10),transparent)]" />
        <div className="container flex flex-col items-center py-20 text-center md:py-28">
          <Badge variant="violet" className="mb-5 gap-1.5 py-1 pl-1.5 pr-3">
            <Sparkles className="h-3.5 w-3.5" />
            Your AI website improvement platform
          </Badge>
          <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Improve your website,{" "}
            <span className="gradient-text">continuously.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-lg text-slate-600">
            BenchBot isn&apos;t a one-off audit tool — it&apos;s an AI platform that keeps making your
            site better: UX, SEO, accessibility and performance insights, competitor benchmarking, and
            tracked progress over time. Start with <strong className="text-ink">2 free audits</strong> — no card required.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="gradient" size="lg">
              <Link href="/signup">
                Start free — 2 audits <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/example-report">See an example report</Link>
            </Button>
          </div>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            score=82/100 · obe.com · nav_depth=1 · no credit card required
          </p>

          {/* Hero preview */}
          <div className="mt-14 w-full max-w-5xl">
            <div className="rounded-2xl border border-border bg-white p-2 shadow-2xl shadow-brand/10">
              <div className="rounded-xl bg-ink p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {AUDIT_PIPELINE.slice(0, 6).map((s, i) => (
                    <div
                      key={s.status}
                      className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                          i < 4 ? "bg-good/20 text-good" : "bg-brand/20 text-brand"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-sidebar-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust strip */}
      <section className="border-y border-border bg-white">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-brand" /> 10 heuristics scored</span>
          <span className="flex items-center gap-2"><Layers className="h-4 w-4 text-brand" /> Up to 10 competitors</span>
          <span className="flex items-center gap-2"><Camera className="h-4 w-4 text-brand" /> Desktop + mobile capture</span>
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet" /> AI + GEO visibility audit</span>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything a strategy team needs, in one audit
          </h2>
          <p className="mt-4 text-slate-600">
            Stop stitching together screenshots, spreadsheets and slides. BenchBot produces the
            whole competitive picture — and the recommendations to act on it.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-white py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">From URL to report in four steps</h2>
            <p className="mt-4 text-slate-600">No setup. No spreadsheets. Just intelligence.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border bg-background p-6">
                <span className="font-mono text-sm font-semibold text-brand">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-8 py-16 text-center text-white md:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(40%_60%_at_80%_20%,rgba(255,255,255,0.18),transparent)]" />
          <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">
            Run your first competitive audit free
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/85">
            See exactly where you stand against your competitors — and the highest-leverage moves to
            pull ahead.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Button asChild size="lg" className="bg-white text-brand hover:bg-white/90">
              <Link href="/signup">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
