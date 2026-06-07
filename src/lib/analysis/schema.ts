import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Zod schemas validating the structured JSON returned by OpenAI. All AI
// output is parsed through these before it touches the database, so a
// malformed/hallucinated response fails closed and we fall back to the
// deterministic generator.
// ─────────────────────────────────────────────────────────────

export const competitorSuggestionSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  reason: z.string().default(""),
});

export const discoverResponseSchema = z.object({
  directCompetitors: z.array(competitorSuggestionSchema).default([]),
  indirectCompetitors: z.array(competitorSuggestionSchema).default([]),
  inspirationSites: z.array(competitorSuggestionSchema).default([]),
});

export type DiscoverResponse = z.infer<typeof discoverResponseSchema>;

const score = z.number().min(0).max(100);

const scoreRowSchema = z.object({
  company_name: z.string(),
  url: z.string(),
  ux_score: score,
  mobile_score: score,
  navigation_score: score,
  content_score: score,
  conversion_score: score,
  ai_visibility_score: score,
});

const heuristicSchema = z.object({
  key: z.string(),
  label: z.string(),
  score: score,
  evidence: z.string(),
  recommendation: z.string(),
});

const contentGapSchema = z.object({
  topic: z.string(),
  covered_by: z.array(z.string()).default([]),
  opportunity: z.string(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export const analysisResponseSchema = z.object({
  overall_score: score,
  competitor_matrix: z.array(scoreRowSchema).min(1),
  heuristics: z.array(heuristicSchema).min(1),
  top_findings: z.array(z.string()).default([]),
  top_opportunities: z.array(z.string()).default([]),
  biggest_gaps: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  sitemap_summary: z
    .object({
      page_count: z.number(),
      depth: z.number(),
      duplicate_sections: z.array(z.string()).default([]),
      missing_sections: z.array(z.string()).default([]),
    })
    .optional(),
  ia_comparison: z.object({
    common_nav_labels: z.array(z.string()).default([]),
    hierarchy_differences: z.array(z.string()).default([]),
    search_visibility: z.string(),
    cta_placement: z.string(),
    footer_structure: z.string(),
  }),
  content_gaps: z.array(contentGapSchema).default([]),
  conversion_audit: z.object({
    cta_clarity: z.string(),
    form_length: z.string(),
    contact_flow: z.string(),
    sticky_ctas: z.string(),
    trust_signals: z.string(),
    lead_magnets: z.string(),
    score: score,
  }),
  ai_visibility: z.object({
    robots_txt: z.string(),
    sitemap_xml: z.string(),
    schema_markup: z.string(),
    metadata: z.string(),
    faq_schema: z.string(),
    product_schema: z.string(),
    organization_schema: z.string(),
    crawlability: z.string(),
    llm_clarity: z.string(),
    score: score,
  }),
  full_report_markdown: z.string(),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
