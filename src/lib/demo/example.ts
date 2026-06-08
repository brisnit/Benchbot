import { generateAuditData } from "@/lib/demo/generate";
import type { Audit, Competitor, CompetitorType, Report, Screenshot } from "@/lib/types";

// The public /example-report uses a real, recognisable competitive set (Nike vs
// peers) with REAL captured homepage screenshots stored in /public/example.
// Scores/findings/sitemaps are AI-estimated for illustration.
const EXAMPLE_SITES: {
  id: string | null;
  slug: string;
  name: string;
  url: string;
  type: CompetitorType;
  reason: string;
}[] = [
  { id: null, slug: "nike", name: "Nike", url: "https://www.nike.com", type: "target", reason: "" },
  { id: "ex_puma", slug: "puma", name: "Puma", url: "https://us.puma.com", type: "direct", reason: "Direct global athletic-wear competitor." },
  { id: "ex_ua", slug: "underarmour", name: "Under Armour", url: "https://www.underarmour.com", type: "direct", reason: "Performance apparel head-to-head." },
  { id: "ex_on", slug: "on", name: "On", url: "https://www.on.com", type: "inspiration", reason: "Best-in-class DTC running brand experience." },
  { id: "ex_allbirds", slug: "allbirds", name: "Allbirds", url: "https://www.allbirds.com", type: "inspiration", reason: "Sustainable-DTC merchandising craft." },
];

// Builds a complete, non-persisted sample audit for the public /example-report
// page so prospects can see the full output without signing up.
export function buildExampleBundle() {
  const created = "2026-05-20T10:00:00.000Z";
  const audit: Audit = {
    id: "aud_example",
    workspace_id: "ws_example",
    user_id: "usr_example",
    target_url: "https://www.nike.com",
    target_name: "Nike",
    site_type: "ecommerce",
    audit_goal: "full_benchmark",
    status: "complete",
    device_mode: "both",
    crawl_settings: ["homepage", "navigation", "product", "search", "mobile", "footer"],
    progress: 100,
    error: null,
    created_at: created,
    updated_at: created,
    completed_at: created,
  };

  const competitors: Competitor[] = EXAMPLE_SITES.filter((s) => s.id).map((s) => ({
    id: s.id as string,
    audit_id: audit.id,
    name: s.name,
    url: s.url,
    competitor_type: s.type,
    reason: s.reason,
    selected: true,
    created_at: created,
  }));

  const data = generateAuditData(audit, competitors);

  // Replace generated placeholder screenshots with the REAL captured ones.
  const screenshots: Screenshot[] = [];
  for (const s of EXAMPLE_SITES) {
    for (const device of ["desktop", "mobile"] as const) {
      screenshots.push({
        id: `shot_${s.slug}_${device}`,
        audit_id: audit.id,
        competitor_id: s.id,
        company_name: s.name,
        url: s.url,
        device_type: device,
        page_type: "homepage",
        storage_path: `/example/${s.slug}-${device}.png`,
        created_at: created,
      });
    }
  }

  const report: Report = {
    ...data.report,
    id: "rep_example",
    created_at: created,
    updated_at: created,
  };

  return {
    audit,
    competitors,
    report,
    scores: data.scores,
    screenshots,
    sitemaps: data.sitemaps,
  };
}
