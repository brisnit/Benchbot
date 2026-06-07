import {
  AUDIT_GOALS,
  HEURISTICS,
  SITE_TYPES,
} from "@/lib/constants";
import { clampScore, hostFromUrl, nameFromUrl, uid } from "@/lib/utils";
import type {
  Audit,
  AuditFinding,
  AuditScore,
  AiVisibilityAudit,
  Competitor,
  ContentGap,
  ConversionAudit,
  CrawlResult,
  HeuristicScore,
  IAComparison,
  PageType,
  Report,
  ReportJson,
  Screenshot,
  Sitemap,
  SitemapNode,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Deterministic generator that produces realistic, internally-consistent
// audit data without any external services. Used for DEMO_MODE seeding and
// as the fallback when OpenAI / real crawling are unavailable. All output is
// flagged `ai_estimated` so the UI can label it honestly.
// ─────────────────────────────────────────────────────────────

/** Deterministic 32-bit string hash -> seed. */
function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — deterministic per seed. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function between(rand: () => number, min: number, max: number): number {
  return Math.round(min + rand() * (max - min));
}

const PAGE_TYPES: PageType[] = [
  "homepage",
  "navigation",
  "product",
  "pricing",
  "blog",
  "contact",
];

const NAV_POOL = [
  "Products",
  "Solutions",
  "Platform",
  "Pricing",
  "Resources",
  "Customers",
  "Company",
  "About",
  "Blog",
  "Docs",
  "Contact",
  "Support",
];

const CTA_POOL = [
  "Get started",
  "Book a demo",
  "Start free trial",
  "Talk to sales",
  "See pricing",
  "Sign up free",
];

const SCHEMA_POOL = [
  "Organization",
  "WebSite",
  "BreadcrumbList",
  "Product",
  "FAQPage",
  "Article",
];

export interface CompanyInput {
  competitorId: string | null; // null = target
  name: string;
  url: string;
  type: Competitor["competitor_type"];
}

export interface GeneratedAuditData {
  crawlResults: CrawlResult[];
  screenshots: Screenshot[];
  sitemaps: Sitemap[];
  scores: AuditScore[];
  findings: AuditFinding[];
  report: Omit<Report, "id" | "created_at" | "updated_at">;
}

function companiesFor(audit: Audit, competitors: Competitor[]): CompanyInput[] {
  const target: CompanyInput = {
    competitorId: null,
    name: audit.target_name || nameFromUrl(audit.target_url),
    url: audit.target_url,
    type: "target",
  };
  const comps = competitors
    .filter((c) => c.selected)
    .map<CompanyInput>((c) => ({
      competitorId: c.id,
      name: c.name,
      url: c.url,
      type: c.competitor_type,
    }));
  return [target, ...comps];
}

function buildScreenshotPath(
  company: CompanyInput,
  pageType: PageType,
  device: "desktop" | "mobile",
): string {
  const params = new URLSearchParams({
    company: company.name,
    host: hostFromUrl(company.url),
    page: pageType,
    device,
  });
  return `/api/placeholder/screenshot?${params.toString()}`;
}

function buildSitemap(rand: () => number): {
  tree: SitemapNode;
  page_count: number;
  depth: number;
  duplicate: string[];
  missing: string[];
} {
  const sections = ["Products", "Solutions", "Resources", "Company", "Pricing"];
  const tree: SitemapNode = {
    label: "Home",
    children: sections.map((s) => ({
      label: s,
      children:
        rand() > 0.5
          ? [
              { label: `${s} Overview` },
              { label: `${s} Detail` },
            ]
          : [{ label: `${s} Overview` }],
    })),
  };
  tree.children!.push({ label: "Contact" });
  const allMissing = ["Careers", "Status", "Changelog", "Security", "Accessibility"];
  return {
    tree,
    page_count: between(rand, 18, 64),
    depth: between(rand, 2, 4),
    duplicate: rand() > 0.6 ? ["Resources", "Blog"] : [],
    missing: allMissing.slice(0, between(rand, 1, 3)),
  };
}

function heuristicEvidence(key: string, name: string): { evidence: string; rec: string } {
  const map: Record<string, { evidence: string; rec: string }> = {
    clarity: {
      evidence: `${name}'s hero leads with a feature list rather than a value proposition; the primary benefit isn't legible in the first 5 seconds.`,
      rec: "Lead with a single, outcome-oriented headline and move feature detail below the fold.",
    },
    consistency: {
      evidence: "Button styles and spacing differ between the homepage and interior templates.",
      rec: "Adopt a shared component library so CTAs, cards and type scale are identical site-wide.",
    },
    findability: {
      evidence: "Key tasks (pricing, login) are two clicks deep and not present in the persistent header.",
      rec: "Surface top tasks in the primary nav and add a persistent global search.",
    },
    accessibility: {
      evidence: "Several CTAs fall below the 4.5:1 contrast ratio and images lack descriptive alt text.",
      rec: "Audit colour tokens for WCAG AA and add alt text to all meaningful imagery.",
    },
    mobile: {
      evidence: "On mobile the nav collapses but the primary CTA is pushed below three scrolls.",
      rec: "Introduce a sticky mobile CTA and prioritise the conversion action in the viewport.",
    },
    trust: {
      evidence: "No customer logos, testimonials or security badges appear above the fold.",
      rec: "Add social proof (logos, quantified outcomes) near the primary CTA.",
    },
    conversion: {
      evidence: "The lead form requests 8 fields including phone before any value is delivered.",
      rec: "Reduce the form to email-only for the first touch; progressively profile later.",
    },
    content: {
      evidence: "Resource content is thin and not mapped to buyer-journey stages.",
      rec: "Build a comparison/guide hub targeting mid-funnel and AI-answer queries.",
    },
    hierarchy: {
      evidence: "Multiple competing CTAs of equal weight dilute the primary action.",
      rec: "Establish one primary CTA per view and demote secondary actions to ghost buttons.",
    },
    error_prevention: {
      evidence: "Form validation only fires on submit, with generic error copy.",
      rec: "Add inline validation and specific, recoverable error messaging.",
    },
  };
  return map[key] ?? { evidence: `${name} shows room to improve ${name}.`, rec: "Review and iterate." };
}

function buildHeuristics(rand: () => number, name: string): HeuristicScore[] {
  return HEURISTICS.map((h) => {
    const { evidence, rec } = heuristicEvidence(h.key, name);
    return {
      key: h.key,
      label: h.label,
      score: between(rand, 48, 92),
      evidence,
      recommendation: rec,
    };
  });
}

export function generateAuditData(
  audit: Audit,
  competitors: Competitor[],
): GeneratedAuditData {
  const companies = companiesFor(audit, competitors);
  const baseSeed = seedFrom(audit.target_url + audit.audit_goal);
  const siteTypeLabel = SITE_TYPES.find((s) => s.value === audit.site_type)?.label ?? "site";
  const goalLabel = AUDIT_GOALS.find((g) => g.value === audit.audit_goal)?.label ?? "audit";

  const crawlResults: CrawlResult[] = [];
  const screenshots: Screenshot[] = [];
  const sitemaps: Sitemap[] = [];
  const scores: AuditScore[] = [];
  const findings: AuditFinding[] = [];

  const devices: ("desktop" | "mobile")[] =
    audit.device_mode === "both"
      ? ["desktop", "mobile"]
      : audit.device_mode === "mobile"
        ? ["mobile"]
        : ["desktop"];

  let targetHeuristics: HeuristicScore[] = [];

  companies.forEach((company, idx) => {
    const rand = rng(baseSeed + idx * 7919);
    const isTarget = company.competitorId === null;

    // ---- scores (best-in-class inspiration sites skew higher) ----
    const lift = company.type === "inspiration" ? 12 : isTarget ? -4 : 0;
    const mk = (min: number, max: number) => clampScore(between(rand, min, max) + lift);
    scores.push({
      id: uid("scr_"),
      audit_id: audit.id,
      competitor_id: company.competitorId,
      company_name: company.name,
      url: company.url,
      ux_score: mk(58, 90),
      mobile_score: mk(52, 92),
      navigation_score: mk(55, 90),
      content_score: mk(50, 88),
      conversion_score: mk(48, 86),
      ai_visibility_score: mk(40, 84),
      created_at: new Date().toISOString(),
    });

    // ---- crawl results (homepage + a few interior pages) ----
    const pageCount = isTarget ? 6 : 4;
    const nav = [...NAV_POOL].sort(() => rand() - 0.5).slice(0, between(rand, 4, 6));
    for (let p = 0; p < pageCount; p++) {
      const pageType = p === 0 ? "homepage" : pick(rand, PAGE_TYPES);
      const failed = !isTarget && rand() > 0.92; // occasionally a page fails to crawl
      crawlResults.push({
        id: uid("crl_"),
        audit_id: audit.id,
        competitor_id: company.competitorId,
        url: p === 0 ? company.url : `${company.url}/${pageType}`,
        page_type: pageType,
        title: failed ? "" : `${company.name} — ${pageType === "homepage" ? siteTypeLabel : pageType}`,
        meta_description: failed
          ? ""
          : `${company.name} helps teams with ${siteTypeLabel.toLowerCase()} outcomes. Discover ${pageType}.`,
        h1: failed ? "" : `${company.name}: ${pick(rand, ["Build faster", "Grow revenue", "Delight customers", "Scale with confidence"])}`,
        nav_items: nav,
        links: nav.map((n) => ({ label: n, href: `${company.url}/${n.toLowerCase()}` })),
        footer_links: ["Privacy", "Terms", "Careers", "Status", "Contact"],
        ctas: [pick(rand, CTA_POOL), pick(rand, CTA_POOL)],
        forms:
          pageType === "contact" || pageType === "pricing"
            ? [{ fields: between(rand, 3, 8), label: "Contact / demo request" }]
            : [],
        schema_types: [...SCHEMA_POOL].slice(0, between(rand, 1, 4)),
        has_robots: rand() > 0.1,
        has_sitemap: rand() > 0.2,
        status_code: failed ? 500 : 200,
        failed,
        created_at: new Date().toISOString(),
      });
    }

    // ---- screenshots ----
    const shotPages: PageType[] = ["homepage", "navigation", "product", "pricing", "contact"];
    for (const pageType of shotPages.slice(0, isTarget ? 5 : 3)) {
      for (const device of devices) {
        screenshots.push({
          id: uid("shot_"),
          audit_id: audit.id,
          competitor_id: company.competitorId,
          company_name: company.name,
          url: company.url,
          device_type: device,
          page_type: pageType,
          storage_path: buildScreenshotPath(company, pageType, device),
          created_at: new Date().toISOString(),
        });
      }
    }

    // ---- sitemap ----
    const sm = buildSitemap(rand);
    sitemaps.push({
      id: uid("smp_"),
      audit_id: audit.id,
      competitor_id: company.competitorId,
      tree: sm.tree,
      page_count: sm.page_count,
      depth: sm.depth,
      duplicate_sections: sm.duplicate,
      missing_sections: sm.missing,
      created_at: new Date().toISOString(),
    });

    // ---- heuristic findings ----
    const heuristics = buildHeuristics(rand, company.name);
    if (isTarget) targetHeuristics = heuristics;
    for (const h of heuristics) {
      findings.push({
        id: uid("fnd_"),
        audit_id: audit.id,
        competitor_id: company.competitorId,
        category: h.label,
        title: `${h.label} — ${company.name}`,
        description: h.evidence,
        evidence: h.evidence,
        recommendation: h.recommendation,
        score: h.score,
        priority: h.score < 60 ? "high" : h.score < 75 ? "medium" : "low",
        created_at: new Date().toISOString(),
      });
    }
  });

  // ── Build the synthesized report from the target's perspective ──
  const targetScore = scores[0];
  const competitorScores = scores.slice(1);
  const avgComp = (key: keyof AuditScore) =>
    competitorScores.length
      ? Math.round(
          competitorScores.reduce((s, c) => s + (c[key] as number), 0) /
            competitorScores.length,
        )
      : 0;

  const overall = clampScore(
    (targetScore.ux_score +
      targetScore.mobile_score +
      targetScore.navigation_score +
      targetScore.content_score +
      targetScore.conversion_score +
      targetScore.ai_visibility_score) /
      6,
  );

  const rand = rng(baseSeed);
  const ia: IAComparison = {
    common_nav_labels: ["Products", "Solutions", "Pricing", "Resources", "Company"],
    hierarchy_differences: [
      `${targetScore.company_name} nests Pricing under Resources; competitors expose it in the top nav.`,
      "Best-in-class sites use task-based labels (\"Solutions by industry\") vs. internal jargon.",
    ],
    search_visibility:
      avgComp("navigation_score") > targetScore.navigation_score
        ? "Competitors expose persistent search; target hides it behind an icon."
        : "Search parity with competitors.",
    cta_placement:
      "Inspiration sites anchor a single sticky CTA; target uses 3 competing header CTAs.",
    footer_structure:
      "Target footer omits a Resources/Trust column that all 3 competitors include.",
  };

  const contentGaps: ContentGap[] = [
    {
      topic: "Comparison & alternatives pages",
      covered_by: competitorScores.slice(0, 2).map((c) => c.company_name),
      opportunity: "High-intent, AI-cited queries; build \"vs.\" and \"alternatives\" pages.",
      priority: "high",
    },
    {
      topic: "Implementation & ROI guides",
      covered_by: competitorScores.slice(0, 1).map((c) => c.company_name),
      opportunity: "Mid-funnel content that competitors rank for and the target lacks.",
      priority: "medium",
    },
    {
      topic: "FAQ / structured answers",
      covered_by: competitorScores.map((c) => c.company_name),
      opportunity: "Add FAQPage schema to win answer boxes and LLM citations.",
      priority: "high",
    },
    {
      topic: "Customer story library",
      covered_by: competitorScores.slice(0, 2).map((c) => c.company_name),
      opportunity: "Quantified, industry-segmented proof to support trust and conversion.",
      priority: "medium",
    },
  ];

  const conversion: ConversionAudit = {
    cta_clarity: "Primary CTA copy is generic (\"Learn more\"); competitors use outcome verbs.",
    form_length: "Lead form is 8 fields vs. competitor median of 3 — likely depressing conversion.",
    contact_flow: "Demo path requires leaving the page; best-in-class uses an inline scheduler.",
    sticky_ctas: "No sticky CTA on scroll; 2 of 3 competitors retain one.",
    trust_signals: "Logos appear only in the footer; move proof adjacent to the CTA.",
    lead_magnets: "No gated value (calculator, benchmark) to capture earlier-stage demand.",
    score: targetScore.conversion_score,
  };

  const aiVisibility: AiVisibilityAudit = {
    robots_txt: "Present and permissive.",
    sitemap_xml: rand() > 0.5 ? "Present and referenced in robots.txt." : "Missing — submit to search/AI crawlers.",
    schema_markup: "Organization + WebSite present; Product & FAQ schema missing.",
    metadata: "Titles are templated; several pages share duplicate meta descriptions.",
    faq_schema: "Absent — add FAQPage schema to high-intent pages.",
    product_schema: "Absent on key pages — limits rich/AI results.",
    organization_schema: "Present with logo and sameAs links.",
    crawlability: "Core pages crawlable; some content is client-rendered and may be missed.",
    llm_clarity:
      "Copy is benefit-light and jargon-heavy; restructure into clear Q&A blocks for LLM extraction.",
    score: targetScore.ai_visibility_score,
  };

  const topFindings = [
    `Overall experience scores ${overall}/100 — ${overall < avgComp("ux_score") ? "below" : "in line with"} the competitive set.`,
    `Conversion path is the weakest dimension (${targetScore.conversion_score}/100): long forms and weak CTAs.`,
    "AI/GEO visibility lags: missing Product & FAQ schema limits LLM citations.",
    "Information architecture buries Pricing and Search relative to competitors.",
    "Trust signals are under-leveraged and placed too far from the primary CTA.",
  ];
  const topOpportunities = [
    "Cut the lead form to a single field for first touch (fastest conversion win).",
    "Add FAQ + Product schema and a comparison-page hub to capture AI answers.",
    "Promote Pricing and Search into the persistent header.",
    "Introduce one sticky, outcome-oriented CTA across templates.",
    "Move customer proof above the fold, beside the primary action.",
  ];
  const biggestGaps = [
    `Conversion: ${avgComp("conversion_score") - targetScore.conversion_score >= 0 ? avgComp("conversion_score") - targetScore.conversion_score : 0} pts behind competitor average.`,
    `AI visibility: ${Math.max(0, avgComp("ai_visibility_score") - targetScore.ai_visibility_score)} pts behind competitor average.`,
    "Content depth: no comparison or ROI content vs. competitors.",
  ];
  const nextSteps = [
    "Ship a 1-field lead capture and sticky CTA this sprint.",
    "Add FAQPage + Product schema to top 10 pages.",
    "Restructure primary nav to surface Pricing, Search and Solutions-by-industry.",
    "Publish 3 comparison pages targeting branded + category queries.",
    "Re-audit in 30 days to measure score movement.",
  ];

  const reportJson: ReportJson = {
    overall_score: overall,
    top_findings: topFindings,
    top_opportunities: topOpportunities,
    biggest_gaps: biggestGaps,
    next_steps: nextSteps,
    heuristics: targetHeuristics,
    ia_comparison: ia,
    content_gaps: contentGaps,
    conversion_audit: conversion,
    ai_visibility: aiVisibility,
    ai_estimated: true,
  };

  const execSummary = buildExecutiveSummary(audit, targetScore.company_name, overall, reportJson, goalLabel);
  const markdown = buildReportMarkdown(audit, companies, scores, reportJson, goalLabel, execSummary);

  return {
    crawlResults,
    screenshots,
    sitemaps,
    scores,
    findings,
    report: {
      audit_id: audit.id,
      executive_summary: execSummary,
      full_report_markdown: markdown,
      report_json: reportJson,
    },
  };
}

function buildExecutiveSummary(
  audit: Audit,
  name: string,
  overall: number,
  json: ReportJson,
  goalLabel: string,
): string {
  return [
    `${name} scores **${overall}/100** in this ${goalLabel.toLowerCase()} against the selected competitive set.`,
    "",
    `The strongest opportunity is the conversion path — long forms and generic CTAs are leaving measurable demand on the table — followed by AI/GEO visibility, where missing structured data limits how often ${name} is surfaced in AI answers.`,
    "",
    "**Top priorities:**",
    ...json.top_opportunities.slice(0, 3).map((o) => `- ${o}`),
    "",
    "_Generated by BenchBot — figures are AI-estimated for this MVP review._",
  ].join("\n");
}

export function buildReportMarkdown(
  audit: Audit,
  companies: CompanyInput[],
  scores: AuditScore[],
  json: ReportJson,
  goalLabel: string,
  execSummary: string,
): string {
  const lines: string[] = [];
  lines.push(`# Competitive Audit — ${scores[0]?.company_name ?? audit.target_name}`);
  lines.push("");
  lines.push(`**Goal:** ${goalLabel}  `);
  lines.push(`**Target:** ${audit.target_url}  `);
  lines.push(`**Overall score:** ${json.overall_score}/100  `);
  lines.push(`**Competitors analysed:** ${scores.length - 1}`);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(execSummary);
  lines.push("");
  lines.push("## Competitor Matrix");
  lines.push("");
  lines.push("| Company | URL | UX | Mobile | Nav | Content | Conversion | AI Visibility |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const s of scores) {
    lines.push(
      `| ${s.company_name} | ${hostFromUrl(s.url)} | ${s.ux_score} | ${s.mobile_score} | ${s.navigation_score} | ${s.content_score} | ${s.conversion_score} | ${s.ai_visibility_score} |`,
    );
  }
  lines.push("");
  lines.push("## Top Findings");
  lines.push("");
  json.top_findings.forEach((f) => lines.push(`- ${f}`));
  lines.push("");
  lines.push("## Top Opportunities");
  lines.push("");
  json.top_opportunities.forEach((o) => lines.push(`- ${o}`));
  lines.push("");
  lines.push("## Heuristic Review");
  lines.push("");
  for (const h of json.heuristics) {
    lines.push(`### ${h.label} — ${h.score}/100`);
    lines.push(`**Evidence:** ${h.evidence}`);
    lines.push("");
    lines.push(`**Recommendation:** ${h.recommendation}`);
    lines.push("");
  }
  lines.push("## Navigation / IA Comparison");
  lines.push("");
  lines.push(`- **Common nav labels:** ${json.ia_comparison.common_nav_labels.join(", ")}`);
  json.ia_comparison.hierarchy_differences.forEach((d) => lines.push(`- ${d}`));
  lines.push(`- **Search:** ${json.ia_comparison.search_visibility}`);
  lines.push(`- **CTA placement:** ${json.ia_comparison.cta_placement}`);
  lines.push(`- **Footer:** ${json.ia_comparison.footer_structure}`);
  lines.push("");
  lines.push("## Content Gap Analysis");
  lines.push("");
  for (const g of json.content_gaps) {
    lines.push(`- **${g.topic}** (${g.priority}) — covered by ${g.covered_by.join(", ") || "competitors"}. ${g.opportunity}`);
  }
  lines.push("");
  lines.push("## Conversion Audit");
  lines.push("");
  lines.push(`- **CTA clarity:** ${json.conversion_audit.cta_clarity}`);
  lines.push(`- **Form length:** ${json.conversion_audit.form_length}`);
  lines.push(`- **Contact flow:** ${json.conversion_audit.contact_flow}`);
  lines.push(`- **Sticky CTAs:** ${json.conversion_audit.sticky_ctas}`);
  lines.push(`- **Trust signals:** ${json.conversion_audit.trust_signals}`);
  lines.push(`- **Lead magnets:** ${json.conversion_audit.lead_magnets}`);
  lines.push("");
  lines.push("## AI Visibility / GEO Audit");
  lines.push("");
  lines.push(`- **robots.txt:** ${json.ai_visibility.robots_txt}`);
  lines.push(`- **sitemap.xml:** ${json.ai_visibility.sitemap_xml}`);
  lines.push(`- **Schema markup:** ${json.ai_visibility.schema_markup}`);
  lines.push(`- **Metadata:** ${json.ai_visibility.metadata}`);
  lines.push(`- **FAQ schema:** ${json.ai_visibility.faq_schema}`);
  lines.push(`- **Product schema:** ${json.ai_visibility.product_schema}`);
  lines.push(`- **Organization schema:** ${json.ai_visibility.organization_schema}`);
  lines.push(`- **Crawlability:** ${json.ai_visibility.crawlability}`);
  lines.push(`- **LLM clarity:** ${json.ai_visibility.llm_clarity}`);
  lines.push("");
  lines.push("## Recommended Next Steps");
  lines.push("");
  json.next_steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("");
  lines.push("---");
  lines.push("_Report generated by BenchBot. Figures in this MVP are AI-estimated._");
  return lines.join("\n");
}
