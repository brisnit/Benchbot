// ─────────────────────────────────────────────────────────────
// Core domain types for BenchBot. These mirror the database schema
// (see supabase/migrations) and are used by both the Supabase and the
// local in-memory data layers so the rest of the app is storage-agnostic.
// ─────────────────────────────────────────────────────────────

export type Role = "owner" | "admin" | "editor" | "viewer" | "client";

export type SiteType =
  | "b2b"
  | "ecommerce"
  | "saas"
  | "nonprofit"
  | "education"
  | "healthcare"
  | "hospitality"
  | "marketplace"
  | "other";

export type AuditGoal =
  | "full_benchmark"
  | "ux_heuristic"
  | "homepage"
  | "navigation_ia"
  | "ecommerce"
  | "lead_gen"
  | "seo_geo"
  | "accessibility"
  | "product_page"
  | "content_strategy";

export type DeviceMode = "desktop" | "mobile" | "both";

export type AuditStatus =
  | "draft"
  | "finding_competitors"
  | "capturing_screenshots"
  | "mapping_navigation"
  | "generating_sitemap"
  | "reviewing_ux"
  | "scoring_heuristics"
  | "finding_content_gaps"
  | "building_report"
  | "complete"
  | "failed";

export type CompetitorType = "direct" | "indirect" | "inspiration" | "custom" | "target";

export type DeviceType = "desktop" | "mobile";

export type PageType =
  | "homepage"
  | "navigation"
  | "product"
  | "category"
  | "search"
  | "forms"
  | "pricing"
  | "account"
  | "blog"
  | "contact"
  | "footer"
  | "other";

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan?: string; // PlanId — "guest" by default
  plan_cycle?: "monthly" | "annual";
  audits_used?: number; // used in the current billing period
  lifetime_audits?: number;
  period_start?: string; // ISO — start of the current usage period
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Audit {
  id: string;
  workspace_id: string;
  user_id: string;
  target_url: string;
  target_name: string;
  site_type: SiteType;
  audit_goal: AuditGoal;
  status: AuditStatus;
  device_mode: DeviceMode;
  crawl_settings: string[];
  progress: number; // 0-100
  error?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface Competitor {
  id: string;
  audit_id: string;
  name: string;
  url: string;
  competitor_type: CompetitorType;
  reason?: string;
  selected: boolean;
  created_at: string;
}

/** A node in a site's primary navigation (supports one level of nesting). */
export interface NavNode {
  label: string;
  href?: string;
  children?: NavNode[];
}

/** Counts of UI building blocks on a page — the "component inventory". */
export interface ComponentCounts {
  buttons: number;
  links: number;
  images: number;
  icons: number; // inline svg
  inputs: number;
  forms: number;
  headings: number;
  videos: number;
  iframes: number;
  sections: number; // landmark/section regions
}

/** One accessibility check result. */
export interface A11yCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "info";
  detail: string;
  count?: number;
}

/** DOM-based accessibility snapshot for a page (its homepage, typically). */
export interface A11yReport {
  score: number; // 0-100
  altCoverage: number; // % images with alt (or decorative)
  totalImages: number;
  labelCoverage: number; // % form controls with an accessible name
  totalInputs: number;
  contrastSampled: number; // text nodes sampled
  contrastIssues: number; // sampled nodes failing AA contrast
  landmarksPresent: number; // count of key landmarks found
  h1Count: number;
  hasLang: boolean;
  ariaCount: number;
  checks: A11yCheck[];
}

export interface CrawlResult {
  id: string;
  audit_id: string;
  competitor_id: string | null; // null = target site
  url: string;
  page_type: PageType;
  title: string;
  meta_description: string;
  h1: string;
  nav_items: string[];
  links: { label: string; href: string }[];
  footer_links: string[];
  ctas: string[];
  forms: { fields: number; label: string }[];
  schema_types: string[];
  has_robots: boolean;
  has_sitemap: boolean;
  status_code: number;
  failed?: boolean;
  // UX-designer enrichments (optional for backwards compatibility)
  element_count?: number; // total DOM elements
  component_counts?: ComponentCounts;
  nav_tree?: NavNode[]; // complete primary navigation
  a11y?: A11yReport; // accessibility snapshot (homepage)
  created_at: string;
}

export interface Screenshot {
  id: string;
  audit_id: string;
  competitor_id: string | null;
  company_name: string;
  url: string;
  device_type: DeviceType;
  page_type: PageType;
  storage_path: string; // public URL or data placeholder descriptor
  created_at: string;
}

export interface SitemapNode {
  label: string;
  children?: SitemapNode[];
}

export interface Sitemap {
  id: string;
  audit_id: string;
  competitor_id: string | null;
  tree: SitemapNode;
  page_count: number;
  depth: number;
  duplicate_sections: string[];
  missing_sections: string[];
  created_at: string;
}

export interface AuditScore {
  id: string;
  audit_id: string;
  competitor_id: string | null;
  company_name: string;
  url: string;
  ux_score: number;
  mobile_score: number;
  navigation_score: number;
  content_score: number;
  conversion_score: number;
  ai_visibility_score: number;
  created_at: string;
}

export type FindingPriority = "high" | "medium" | "low";

export interface AuditFinding {
  id: string;
  audit_id: string;
  competitor_id: string | null;
  category: string; // heuristic / section name
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  score: number; // 0-100
  priority: FindingPriority;
  created_at: string;
}

export interface HeuristicScore {
  key: string;
  label: string;
  score: number;
  evidence: string;
  recommendation: string;
}

export interface IAComparison {
  common_nav_labels: string[];
  hierarchy_differences: string[];
  search_visibility: string;
  cta_placement: string;
  footer_structure: string;
}

export interface ContentGap {
  topic: string;
  covered_by: string[];
  opportunity: string;
  priority: FindingPriority;
}

export interface ConversionAudit {
  cta_clarity: string;
  form_length: string;
  contact_flow: string;
  sticky_ctas: string;
  trust_signals: string;
  lead_magnets: string;
  score: number;
}

export interface AiVisibilityAudit {
  robots_txt: string;
  sitemap_xml: string;
  schema_markup: string;
  metadata: string;
  faq_schema: string;
  product_schema: string;
  organization_schema: string;
  crawlability: string;
  llm_clarity: string;
  score: number;
}

export interface ReportJson {
  overall_score: number;
  top_findings: string[];
  top_opportunities: string[];
  biggest_gaps: string[];
  next_steps: string[];
  heuristics: HeuristicScore[];
  ia_comparison: IAComparison;
  content_gaps: ContentGap[];
  conversion_audit: ConversionAudit;
  ai_visibility: AiVisibilityAudit;
  ai_estimated: boolean; // true when generated without real web data
}

export interface ImprovementTask {
  id: string;
  audit_id: string;
  title: string;
  description: string;
  category: string;
  priority: FindingPriority;
  impact_points: number; // estimated score uplift
  impact_label: string; // e.g. "+14 UX score"
  effort_hours: number;
  effort_label: string; // e.g. "2 hours"
  completed: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  audit_id: string;
  executive_summary: string;
  full_report_markdown: string;
  report_json: ReportJson;
  created_at: string;
  updated_at: string;
}

// A fully-hydrated audit, returned by GET /api/audits/[id]
export interface AuditBundle {
  audit: Audit;
  competitors: Competitor[];
  scores: AuditScore[];
  screenshots: Screenshot[];
  sitemaps: Sitemap[];
  findings: AuditFinding[];
  crawlResults: CrawlResult[];
  report: Report | null;
}
