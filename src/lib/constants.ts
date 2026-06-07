import type {
  AuditGoal,
  AuditStatus,
  DeviceMode,
  SiteType,
} from "./types";

export const SITE_TYPES: { value: SiteType; label: string }[] = [
  { value: "b2b", label: "B2B Website" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "saas", label: "SaaS" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "hospitality", label: "Hospitality" },
  { value: "marketplace", label: "Marketplace" },
  { value: "other", label: "Other" },
];

export const AUDIT_GOALS: {
  value: AuditGoal;
  label: string;
  description: string;
}[] = [
  {
    value: "full_benchmark",
    label: "Full competitive benchmark",
    description: "End-to-end comparison across UX, IA, content, conversion and AI visibility.",
  },
  {
    value: "ux_heuristic",
    label: "UX heuristic audit",
    description: "Score the experience against 10 usability heuristics with evidence.",
  },
  {
    value: "homepage",
    label: "Homepage audit",
    description: "Deep critique of the homepage messaging, hierarchy and CTAs.",
  },
  {
    value: "navigation_ia",
    label: "Navigation / IA audit",
    description: "Compare information architecture, labels and findability.",
  },
  {
    value: "ecommerce",
    label: "Ecommerce audit",
    description: "Category, product and checkout experience benchmarking.",
  },
  {
    value: "lead_gen",
    label: "Lead generation audit",
    description: "Forms, demos, trust signals and conversion path analysis.",
  },
  {
    value: "seo_geo",
    label: "SEO / GEO audit",
    description: "Technical SEO plus AI/LLM visibility (Generative Engine Optimization).",
  },
  {
    value: "accessibility",
    label: "Accessibility audit",
    description: "Heuristic accessibility review of contrast, semantics and flows.",
  },
  {
    value: "product_page",
    label: "Product page audit",
    description: "Detail page persuasion, clarity and merchandising.",
  },
  {
    value: "content_strategy",
    label: "Content strategy audit",
    description: "Topic coverage, content gaps and resource recommendations.",
  },
];

export const CRAWL_OPTIONS: { value: string; label: string }[] = [
  { value: "homepage", label: "Homepage" },
  { value: "navigation", label: "Navigation" },
  { value: "product", label: "Product/category pages" },
  { value: "search", label: "Search" },
  { value: "forms", label: "Forms" },
  { value: "pricing", label: "Pricing" },
  { value: "account", label: "Account/login" },
  { value: "blog", label: "Blog/resources" },
  { value: "contact", label: "Contact flow" },
  { value: "mobile", label: "Mobile experience" },
  { value: "footer", label: "Footer" },
  { value: "technical_seo", label: "Technical SEO" },
  { value: "schema_geo", label: "Schema/GEO" },
];

export const DEVICE_MODES: { value: DeviceMode; label: string }[] = [
  { value: "desktop", label: "Desktop only" },
  { value: "mobile", label: "Mobile only" },
  { value: "both", label: "Desktop + mobile" },
];

// Ordered pipeline shown on the run screen.
export const AUDIT_PIPELINE: {
  status: AuditStatus;
  label: string;
  progress: number;
}[] = [
  { status: "finding_competitors", label: "Finding competitors", progress: 8 },
  { status: "capturing_screenshots", label: "Capturing screenshots", progress: 24 },
  { status: "mapping_navigation", label: "Mapping navigation", progress: 38 },
  { status: "generating_sitemap", label: "Generating sitemap", progress: 50 },
  { status: "reviewing_ux", label: "Reviewing UX patterns", progress: 64 },
  { status: "scoring_heuristics", label: "Scoring heuristics", progress: 76 },
  { status: "finding_content_gaps", label: "Finding content gaps", progress: 88 },
  { status: "building_report", label: "Building report", progress: 96 },
  { status: "complete", label: "Complete", progress: 100 },
];

export const HEURISTICS: { key: string; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "consistency", label: "Consistency" },
  { key: "findability", label: "Findability" },
  { key: "accessibility", label: "Accessibility" },
  { key: "mobile", label: "Mobile usability" },
  { key: "trust", label: "Trust" },
  { key: "conversion", label: "Conversion" },
  { key: "content", label: "Content usefulness" },
  { key: "hierarchy", label: "Visual hierarchy" },
  { key: "error_prevention", label: "Error prevention" },
];

export const MAX_COMPETITORS = 10;

export function siteTypeLabel(v: SiteType): string {
  return SITE_TYPES.find((s) => s.value === v)?.label ?? v;
}

export function auditGoalLabel(v: AuditGoal): string {
  return AUDIT_GOALS.find((g) => g.value === v)?.label ?? v;
}
