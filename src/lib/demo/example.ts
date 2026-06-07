import { generateAuditData } from "@/lib/demo/generate";
import type { Audit, Competitor, Report } from "@/lib/types";

// Builds a complete, non-persisted sample audit for the public /example-report
// page so prospects can see the full output without signing up.
export function buildExampleBundle() {
  const created = "2026-05-20T10:00:00.000Z";
  const audit: Audit = {
    id: "aud_example",
    workspace_id: "ws_example",
    user_id: "usr_example",
    target_url: "https://acmecloud.com",
    target_name: "Acme Cloud",
    site_type: "saas",
    audit_goal: "full_benchmark",
    status: "complete",
    device_mode: "both",
    crawl_settings: ["homepage", "navigation", "pricing", "forms", "footer", "schema_geo"],
    progress: 100,
    error: null,
    created_at: created,
    updated_at: created,
    completed_at: created,
  };

  const competitors: Competitor[] = [
    { id: "ex_1", audit_id: audit.id, name: "Vercel", url: "https://vercel.com", competitor_type: "direct", reason: "Direct platform competitor.", selected: true, created_at: created },
    { id: "ex_2", audit_id: audit.id, name: "Netlify", url: "https://netlify.com", competitor_type: "direct", reason: "Overlapping audience.", selected: true, created_at: created },
    { id: "ex_3", audit_id: audit.id, name: "Linear", url: "https://linear.app", competitor_type: "inspiration", reason: "Best-in-class marketing craft.", selected: true, created_at: created },
  ];

  const data = generateAuditData(audit, competitors);
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
    screenshots: data.screenshots,
    sitemaps: data.sitemaps,
  };
}
