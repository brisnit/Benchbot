import { env } from "@/lib/env";
import {
  getAudit,
  listCompetitors,
  replaceCrawlResults,
  replaceFindings,
  replaceScores,
  replaceScreenshots,
  replaceSitemaps,
  updateAudit,
  upsertReport,
} from "@/lib/db";
import { generateAuditData, type CompanyInput } from "@/lib/demo/generate";
import { analyzeAudit } from "@/lib/analysis/analyze";
import { crawlAudit } from "@/lib/crawler/crawl";
import { nameFromUrl } from "@/lib/utils";
import type { Audit, AuditStatus, Competitor } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Track in-flight runs in this process to avoid double execution.
const inFlight = new Set<string>();

function companiesFor(audit: Audit, competitors: Competitor[]): CompanyInput[] {
  return [
    {
      competitorId: null,
      name: audit.target_name || nameFromUrl(audit.target_url),
      url: audit.target_url,
      type: "target",
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

async function step(auditId: string, status: AuditStatus, progress: number, ms = 700) {
  updateAudit(auditId, { status, progress });
  await sleep(ms);
}

/**
 * Runs the full audit pipeline, updating status/progress as it goes so the
 * run screen can poll. Designed to be fire-and-forget. Fault-tolerant: any
 * failure degrades to generated data and the audit still completes with a note.
 */
export async function runAudit(auditId: string): Promise<void> {
  const existing = getAudit(auditId);
  if (!existing) return;
  // `inFlight` (this process) is the reentrancy guard — the /run route marks
  // the audit as running before calling us, so we must not also bail on status.
  if (inFlight.has(auditId)) return;
  inFlight.add(auditId);

  try {
    const competitors = listCompetitors(auditId);
    const audit = existing;
    const companies = companiesFor(audit, competitors);

    // Deterministic baseline that always exists (mock crawl + analysis).
    const baseline = generateAuditData(audit, competitors);

    await step(auditId, "finding_competitors", 8, 500);

    // ---- Capture (crawl) ----
    await step(auditId, "capturing_screenshots", 20, 200);
    let crawlResults = baseline.crawlResults;
    let screenshots = baseline.screenshots;
    const failures: string[] = [];
    if (env.enableRealCrawl) {
      try {
        const out = await crawlAudit(audit, companies);
        if (out.crawlResults.length) crawlResults = out.crawlResults;
        if (out.screenshots.length) screenshots = out.screenshots;
        failures.push(...out.failures);
      } catch (err) {
        failures.push(`crawler unavailable: ${(err as Error).message.slice(0, 80)}`);
      }
    }
    replaceCrawlResults(auditId, crawlResults);
    replaceScreenshots(auditId, screenshots);
    updateAudit(auditId, { progress: 24 });
    await sleep(400);

    await step(auditId, "mapping_navigation", 38, 600);

    // ---- Sitemaps ----
    await step(auditId, "generating_sitemap", 50, 200);
    replaceSitemaps(auditId, baseline.sitemaps);
    await sleep(400);

    await step(auditId, "reviewing_ux", 64, 600);

    // ---- Analysis (OpenAI or generator) ----
    await step(auditId, "scoring_heuristics", 70, 200);
    const analysis = await analyzeAudit(audit, competitors, crawlResults);
    replaceScores(auditId, analysis.scores);
    replaceFindings(auditId, analysis.findings);
    updateAudit(auditId, { progress: 76 });
    await sleep(400);

    await step(auditId, "finding_content_gaps", 88, 600);

    // ---- Report ----
    await step(auditId, "building_report", 96, 200);
    upsertReport(auditId, analysis.report);
    await sleep(500);

    updateAudit(auditId, {
      status: "complete",
      progress: 100,
      error: failures.length ? `Completed with ${failures.length} skipped page(s).` : null,
    });
  } catch (err) {
    // Last-resort: still try to leave usable data behind.
    try {
      const audit = getAudit(auditId);
      const competitors = listCompetitors(auditId);
      if (audit) {
        const baseline = generateAuditData(audit, competitors);
        replaceCrawlResults(auditId, baseline.crawlResults);
        replaceScreenshots(auditId, baseline.screenshots);
        replaceSitemaps(auditId, baseline.sitemaps);
        replaceScores(auditId, baseline.scores);
        replaceFindings(auditId, baseline.findings);
        upsertReport(auditId, baseline.report);
        updateAudit(auditId, {
          status: "complete",
          progress: 100,
          error: `Recovered with estimated data after an error: ${(err as Error).message.slice(0, 80)}`,
        });
      }
    } catch {
      updateAudit(auditId, { status: "failed", progress: 100, error: (err as Error).message });
    }
  } finally {
    inFlight.delete(auditId);
  }
}
