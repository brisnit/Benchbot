import { getOpenAI } from "@/lib/openai/client";
import { env } from "@/lib/env";
import { analysisResponseSchema } from "@/lib/analysis/schema";
import { generateAuditData, buildReportMarkdown, composeExecutiveSummary, type CompanyInput } from "@/lib/demo/generate";
import { auditGoalLabel, siteTypeLabel } from "@/lib/constants";
import { clampScore, hostFromUrl, nameFromUrl, uid } from "@/lib/utils";
import type {
  Audit,
  AuditFinding,
  AuditScore,
  Competitor,
  CrawlResult,
  Report,
  ReportJson,
} from "@/lib/types";

export interface AnalysisResult {
  scores: AuditScore[];
  findings: AuditFinding[];
  report: Omit<Report, "id" | "created_at" | "updated_at">;
}

// Compact, token-bounded view of the crawl data sent to the model.
function summariseCrawl(crawl: CrawlResult[], companies: CompanyInput[]): string {
  return companies
    .map((c) => {
      const pages = crawl.filter((r) => r.competitor_id === c.competitorId);
      const home = pages.find((p) => p.page_type === "homepage") ?? pages[0];
      return [
        `## ${c.name} (${hostFromUrl(c.url)}) — ${c.type}`,
        `title: ${home?.title || "n/a"}`,
        `h1: ${home?.h1 || "n/a"}`,
        `meta: ${(home?.meta_description || "n/a").slice(0, 160)}`,
        `nav: ${(home?.nav_items || []).join(", ") || "n/a"}`,
        `ctas: ${(home?.ctas || []).join(", ") || "n/a"}`,
        `forms: ${(home?.forms || []).map((f) => `${f.label}(${f.fields})`).join(", ") || "none"}`,
        `schema: ${(home?.schema_types || []).join(", ") || "none"}`,
        `robots: ${home?.has_robots ? "yes" : "no"}, sitemap: ${home?.has_sitemap ? "yes" : "no"}`,
        `pages_crawled: ${pages.length}, failed: ${pages.filter((p) => p.failed).length}`,
      ].join("\n");
    })
    .join("\n\n");
}

function companiesFromCompetitors(audit: Audit, competitors: Competitor[]): CompanyInput[] {
  return [
    {
      competitorId: null,
      name: audit.target_name || nameFromUrl(audit.target_url),
      url: audit.target_url,
      type: "target" as const,
    },
    ...competitors
      .filter((c) => c.selected)
      .map((c) => ({
        competitorId: c.id,
        name: c.name,
        url: c.url,
        type: c.competitor_type,
      })),
  ];
}

/**
 * Produce the full analysis. Uses OpenAI when a key is configured and the
 * response validates against the Zod schema; otherwise (or on any error)
 * falls back to the deterministic generator. Always returns valid data.
 */
export async function analyzeAudit(
  audit: Audit,
  competitors: Competitor[],
  crawl: CrawlResult[],
): Promise<AnalysisResult> {
  const fallback = generateAuditData(audit, competitors);
  const fallbackResult: AnalysisResult = {
    scores: fallback.scores,
    findings: fallback.findings,
    report: fallback.report,
  };

  const openai = getOpenAI();
  if (!openai) return fallbackResult;

  const companies = companiesFromCompetitors(audit, competitors);

  try {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            `Audit goal: ${auditGoalLabel(audit.audit_goal)}`,
            `Target site type: ${siteTypeLabel(audit.site_type)}`,
            `Target: ${audit.target_name} (${audit.target_url})`,
            "",
            "Crawl data:",
            summariseCrawl(crawl, companies),
          ].join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = analysisResponseSchema.parse(JSON.parse(raw));

    // Map validated AI output into our domain rows.
    const now = new Date().toISOString();
    const scores: AuditScore[] = parsed.competitor_matrix.map((row, idx) => {
      const match = companies.find(
        (c) => hostFromUrl(c.url) === hostFromUrl(row.url) || c.name === row.company_name,
      );
      return {
        id: uid("scr_"),
        audit_id: audit.id,
        competitor_id: match ? match.competitorId : idx === 0 ? null : null,
        company_name: row.company_name,
        url: row.url,
        ux_score: clampScore(row.ux_score),
        mobile_score: clampScore(row.mobile_score),
        navigation_score: clampScore(row.navigation_score),
        content_score: clampScore(row.content_score),
        conversion_score: clampScore(row.conversion_score),
        ai_visibility_score: clampScore(row.ai_visibility_score),
        created_at: now,
      };
    });

    const findings: AuditFinding[] = parsed.heuristics.map((h) => ({
      id: uid("fnd_"),
      audit_id: audit.id,
      competitor_id: null,
      category: h.label,
      title: `${h.label} — ${audit.target_name}`,
      description: h.evidence,
      evidence: h.evidence,
      recommendation: h.recommendation,
      score: clampScore(h.score),
      priority: h.score < 60 ? "high" : h.score < 75 ? "medium" : "low",
      created_at: now,
    }));

    const reportJson: ReportJson = {
      overall_score: clampScore(parsed.overall_score),
      top_findings: parsed.top_findings,
      top_opportunities: parsed.top_opportunities,
      biggest_gaps: parsed.biggest_gaps,
      next_steps: parsed.next_steps,
      heuristics: parsed.heuristics,
      ia_comparison: parsed.ia_comparison,
      content_gaps: parsed.content_gaps,
      conversion_audit: parsed.conversion_audit,
      ai_visibility: parsed.ai_visibility,
      ai_estimated: true,
    };

    const goalLabel = auditGoalLabel(audit.audit_goal);
    // Comprehensive summary (all report data) for the Executive Summary + copy.
    const execSummary = composeExecutiveSummary(reportJson, audit.target_name, goalLabel);
    // Short headline for the top of the full report markdown.
    const headline = [
      `${audit.target_name} scores **${reportJson.overall_score}/100** in this ${goalLabel.toLowerCase()}.`,
      "",
      "**Top priorities:**",
      ...reportJson.top_opportunities.slice(0, 3).map((o) => `- ${o}`),
    ].join("\n");
    // Always build the full report ourselves so every section is present.
    const markdown = buildReportMarkdown(audit, companies, scores, reportJson, goalLabel, headline);

    return {
      scores,
      findings,
      report: {
        audit_id: audit.id,
        executive_summary: execSummary,
        full_report_markdown: markdown,
        report_json: reportJson,
      },
    };
  } catch {
    return fallbackResult;
  }
}

const SYSTEM_PROMPT = `You are BenchBot, a senior UX strategist and competitive analyst. You receive crawl data for a target website and its competitors and produce a rigorous, evidence-based competitive audit.

Respond ONLY with a single JSON object matching this shape:
{
  "overall_score": number 0-100,
  "competitor_matrix": [{ "company_name", "url", "ux_score","mobile_score","navigation_score","content_score","conversion_score","ai_visibility_score" }],  // include the target FIRST, then each competitor
  "heuristics": [{ "key","label","score","evidence","recommendation" }],  // exactly these 10 labels: Clarity, Consistency, Findability, Accessibility, Mobile usability, Trust, Conversion, Content usefulness, Visual hierarchy, Error prevention
  "top_findings": string[5],
  "top_opportunities": string[5],
  "biggest_gaps": string[3],
  "next_steps": string[5],
  "ia_comparison": { "common_nav_labels": string[], "hierarchy_differences": string[], "search_visibility","cta_placement","footer_structure" },
  "content_gaps": [{ "topic","covered_by":string[],"opportunity","priority":"high|medium|low" }],
  "conversion_audit": { "cta_clarity","form_length","contact_flow","sticky_ctas","trust_signals","lead_magnets","score" },
  "ai_visibility": { "robots_txt","sitemap_xml","schema_markup","metadata","faq_schema","product_schema","organization_schema","crawlability","llm_clarity","score" },
  "full_report_markdown": string  // a clean, client-ready markdown report
}

Scores must be evidence-based and vary realistically between companies. All findings concern the TARGET site. Be specific and actionable. Where crawl data is thin, make reasonable expert inferences and keep them plausible.`;
