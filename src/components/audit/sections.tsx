import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSearch,
  GitBranch,
  Layers,
  Lightbulb,
  ListChecks,
  MousePointerClick,
  Network,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { SectionCard } from "@/components/audit/section-card";
import { SitemapTree } from "@/components/audit/sitemap-tree";
import { ScoreBar, ScorePill, ScoreRing } from "@/components/ui/score";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/audit/markdown";
import { hostFromUrl } from "@/lib/utils";
import type {
  AuditScore,
  FindingPriority,
  Report,
  Sitemap,
} from "@/lib/types";

function priorityVariant(p: FindingPriority): "critical" | "warn" | "secondary" {
  return p === "high" ? "critical" : p === "medium" ? "warn" : "secondary";
}

// ── 1. Executive Summary ──────────────────────────────────────
export function ExecutiveSummarySection({ report }: { report: Report }) {
  const j = report.report_json;
  const lists: { title: string; icon: React.ComponentType<{ className?: string }>; items: string[]; tone: string }[] = [
    { title: "Top findings", icon: FileSearch, items: j.top_findings, tone: "text-brand" },
    { title: "Top opportunities", icon: Lightbulb, items: j.top_opportunities, tone: "text-good" },
    { title: "Biggest gaps", icon: AlertTriangle, items: j.biggest_gaps, tone: "text-critical" },
    { title: "Recommended next steps", icon: ListChecks, items: j.next_steps, tone: "text-violet" },
  ];
  return (
    <SectionCard icon={Sparkles} title="Executive Summary" description="The headline read on competitive position and where to act first." id="summary">
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/30 p-5">
          <ScoreRing score={j.overall_score} label="Overall" size={130} />
          <p className="mt-3 text-center text-xs text-muted-foreground">Composite of all six dimensions</p>
        </div>
        <div className="prose-sm">
          <Markdown content={report.executive_summary} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {lists.map((l) => (
          <div key={l.title} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <l.icon className={`h-4 w-4 ${l.tone}`} />
              <h3 className="text-sm font-semibold">{l.title}</h3>
            </div>
            <ul className="space-y-1.5">
              {l.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 2. Competitor Matrix ──────────────────────────────────────
export function CompetitorMatrixSection({ scores }: { scores: AuditScore[] }) {
  const cols: { key: keyof AuditScore; label: string }[] = [
    { key: "ux_score", label: "UX" },
    { key: "mobile_score", label: "Mobile" },
    { key: "navigation_score", label: "Navigation" },
    { key: "content_score", label: "Content" },
    { key: "conversion_score", label: "Conversion" },
    { key: "ai_visibility_score", label: "AI Visibility" },
  ];
  return (
    <SectionCard icon={BarChart3} title="Competitor Matrix" description="Side-by-side scoring across every dimension. Your site is highlighted." id="matrix">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">URL</th>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2 text-center font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.map((s, idx) => {
              const isTarget = idx === 0;
              return (
                <tr
                  key={s.id}
                  className={`border-b border-border last:border-0 ${isTarget ? "bg-brand-50/60" : ""}`}
                >
                  <td className="px-3 py-2.5 font-medium text-ink">
                    <span className="flex items-center gap-2">
                      {s.company_name}
                      {isTarget && <Badge variant="brand" className="text-[10px]">You</Badge>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{hostFromUrl(s.url)}</td>
                  {cols.map((c) => (
                    <td key={c.key} className="px-3 py-2.5 text-center">
                      <ScorePill score={s[c.key] as number} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ── 4. Heuristic Review ───────────────────────────────────────
export function HeuristicReviewSection({ report }: { report: Report }) {
  return (
    <SectionCard icon={Target} title="Heuristic Review" description="Ten usability heuristics, each scored with evidence and a recommendation." id="heuristics">
      <div className="space-y-3">
        {report.report_json.heuristics.map((h) => (
          <div key={h.key} className="rounded-lg border border-border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-sm font-semibold">{h.label}</h3>
              <div className="w-full sm:w-48">
                <ScoreBar score={h.score} />
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
                <p className="mt-1 text-sm text-slate-700">{h.evidence}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Recommendation</p>
                <p className="mt-1 text-sm text-slate-700">{h.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 5. Visual Sitemap ─────────────────────────────────────────
export function VisualSitemapSection({ sitemap }: { sitemap: Sitemap | undefined }) {
  if (!sitemap) {
    return (
      <SectionCard icon={GitBranch} title="Visual Sitemap" id="sitemap">
        <p className="text-sm text-muted-foreground">No sitemap was generated for this audit.</p>
      </SectionCard>
    );
  }
  const stats = [
    { label: "Pages", value: sitemap.page_count },
    { label: "Nav depth", value: sitemap.depth },
    { label: "Duplicate sections", value: sitemap.duplicate_sections.length },
    { label: "Missing sections", value: sitemap.missing_sections.length },
  ];
  return (
    <SectionCard
      icon={GitBranch}
      title="Visual Sitemap"
      description={`${sitemap.page_count.toLocaleString()} pages mapped · nav depth ${sitemap.depth} · information architecture with structural flags.`}
      id="sitemap"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <SitemapTree tree={sitemap.tree} />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                <p className="font-display text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {sitemap.duplicate_sections.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#B5740B]">Duplicate sections</p>
              <div className="flex flex-wrap gap-1.5">
                {sitemap.duplicate_sections.map((d) => (
                  <Badge key={d} variant="warn">{d}</Badge>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-critical">Missing common sections</p>
            <div className="flex flex-wrap gap-1.5">
              {sitemap.missing_sections.map((m) => (
                <Badge key={m} variant="critical">{m}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ── 6. Navigation / IA Comparison ─────────────────────────────
export function IAComparisonSection({ report }: { report: Report }) {
  const ia = report.report_json.ia_comparison;
  return (
    <SectionCard icon={Network} title="Navigation / IA Comparison" description="How your information architecture compares to the competitive set." id="ia">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-semibold">Common nav labels</p>
          <div className="flex flex-wrap gap-1.5">
            {ia.common_nav_labels.map((l) => (
              <Badge key={l} variant="secondary">{l}</Badge>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-semibold">Hierarchy differences</p>
          <ul className="space-y-1.5">
            {ia.hierarchy_differences.map((d, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Search, label: "Search visibility", value: ia.search_visibility },
          { icon: MousePointerClick, label: "CTA placement", value: ia.cta_placement },
          { icon: Layers, label: "Footer structure", value: ia.footer_structure },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border p-4">
            <div className="mb-1.5 flex items-center gap-2 text-brand">
              <item.icon className="h-4 w-4" />
              <p className="text-sm font-semibold text-ink">{item.label}</p>
            </div>
            <p className="text-sm text-slate-700">{item.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 7. Content Gap Analysis ───────────────────────────────────
export function ContentGapSection({ report }: { report: Report }) {
  return (
    <SectionCard icon={Search} title="Content Gap Analysis" description="Topics competitors cover that your site is missing, ranked by opportunity." id="content">
      <div className="space-y-3">
        {report.report_json.content_gaps.map((g, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-sm font-semibold">{g.topic}</h3>
              <Badge variant={priorityVariant(g.priority)} className="shrink-0 capitalize">{g.priority}</Badge>
            </div>
            <p className="mt-1.5 text-sm text-slate-700">{g.opportunity}</p>
            {g.covered_by.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Covered by: <span className="font-medium text-slate-600">{g.covered_by.join(", ")}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 8. Conversion Audit ───────────────────────────────────────
export function ConversionAuditSection({ report }: { report: Report }) {
  const c = report.report_json.conversion_audit;
  const items = [
    { label: "CTA clarity", value: c.cta_clarity },
    { label: "Form length", value: c.form_length },
    { label: "Contact / demo flow", value: c.contact_flow },
    { label: "Sticky CTAs", value: c.sticky_ctas },
    { label: "Trust signals", value: c.trust_signals },
    { label: "Lead magnets", value: c.lead_magnets },
  ];
  return (
    <SectionCard
      icon={MousePointerClick}
      title="Conversion Audit"
      description="Where the conversion path leaks — and how competitors close it."
      id="conversion"
      action={<div className="text-right"><ScorePill score={c.score} /><p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Conversion</p></div>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold">{it.label}</p>
            <p className="mt-1 text-sm text-slate-700">{it.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 9. AI Visibility / GEO Audit ──────────────────────────────
export function AiVisibilitySection({ report }: { report: Report }) {
  const a = report.report_json.ai_visibility;
  const items = [
    { label: "robots.txt", value: a.robots_txt },
    { label: "sitemap.xml", value: a.sitemap_xml },
    { label: "Schema markup", value: a.schema_markup },
    { label: "Metadata", value: a.metadata },
    { label: "FAQ schema", value: a.faq_schema },
    { label: "Product schema", value: a.product_schema },
    { label: "Organization schema", value: a.organization_schema },
    { label: "Crawlability", value: a.crawlability },
    { label: "LLM-friendly clarity", value: a.llm_clarity },
  ];
  return (
    <SectionCard
      icon={Sparkles}
      title="AI Visibility / GEO Audit"
      description="How discoverable and citable your site is to search crawlers and LLMs."
      id="ai-visibility"
      action={<div className="text-right"><ScorePill score={a.score} /><p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">AI Visibility</p></div>}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-border p-4">
            <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-brand">
              <CheckCircle2 className="h-3.5 w-3.5" /> {it.label}
            </p>
            <p className="mt-1.5 text-sm text-slate-700">{it.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
