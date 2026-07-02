import {
  listAudits,
  listCompetitors,
  createAudit,
  saveCompetitors,
  getAuditBundle,
  recordAuditUsage,
  getUser,
  getWorkspace,
} from "@/lib/db";
import { runAudit } from "@/lib/runner";
import { getPlan } from "@/lib/billing/plans";
import { hostFromUrl } from "@/lib/utils";
import { env } from "@/lib/env";
import type { Audit } from "@/lib/types";

export interface SiteResult {
  name: string;
  host: string;
  before: number | null;
  after: number;
  auditId: string;
}

// Plans that get automated weekly audits.
export function weeklyEligible(plan: string | undefined): boolean {
  return ["professional", "agency", "enterprise"].includes(getPlan(plan).id);
}

async function reRunLatest(latest: Audit): Promise<{ auditId: string; after: number }> {
  const comps = listCompetitors(latest.id).filter((c) => c.selected);
  const audit = createAudit({
    workspace_id: latest.workspace_id,
    user_id: latest.user_id,
    target_url: latest.target_url,
    target_name: latest.target_name,
    site_type: latest.site_type,
    audit_goal: latest.audit_goal,
    device_mode: latest.device_mode,
    crawl_settings: latest.crawl_settings,
    status: "draft",
    error: null,
  });
  saveCompetitors(
    audit.id,
    comps.map((c) => ({ name: c.name, url: c.url, competitor_type: c.competitor_type, reason: c.reason, selected: true })),
  );
  recordAuditUsage(latest.workspace_id);
  await runAudit(audit.id);
  const b = getAuditBundle(audit.id);
  return { auditId: audit.id, after: b?.report?.report_json.overall_score ?? 0 };
}

// Re-audits the latest audit for each distinct site in a workspace.
export async function runWeeklyForWorkspace(workspaceId: string): Promise<SiteResult[]> {
  const audits = listAudits(workspaceId).filter((a) => a.status === "complete");
  const latestByHost = new Map<string, Audit>();
  for (const a of audits) {
    const h = hostFromUrl(a.target_url);
    if (!latestByHost.has(h)) latestByHost.set(h, a); // listAudits is newest-first
  }
  const results: SiteResult[] = [];
  for (const [host, latest] of latestByHost) {
    const before = getAuditBundle(latest.id)?.report?.report_json.overall_score ?? null;
    const { auditId, after } = await reRunLatest(latest);
    results.push({ name: latest.target_name, host, before, after, auditId });
  }
  return results;
}

export function weeklyEmail(workspaceId: string, results: SiteResult[]): { to: string; subject: string; html: string } | null {
  const ws = getWorkspace(workspaceId);
  const owner = ws ? getUser(ws.owner_id) : undefined;
  if (!owner?.email || results.length === 0) return null;

  const app = env.appUrl;
  const rows = results
    .map((r) => {
      const delta = r.before == null ? 0 : r.after - r.before;
      const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
      const color = delta > 0 ? "#16C098" : delta < 0 ? "#F31268" : "#647488";
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #E4E7EF;font-weight:600;color:#0B1117">${r.name}<br><span style="font-weight:400;color:#94A3B8;font-size:12px">${r.host}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid #E4E7EF;text-align:right;font-size:22px;font-weight:700;color:#0B1117">${r.after}<span style="font-size:12px;color:${color};font-weight:600"> ${arrow} ${delta > 0 ? "+" : ""}${delta}</span></td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#F6F7FB;font-family:Inter,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:800;font-size:20px;color:#0B1117">Bench<span style="color:#3552E6">Bot</span></div>
    <h1 style="font-size:22px;color:#0B1117;margin:24px 0 4px">Your weekly website report</h1>
    <p style="color:#647488;margin:0 0 20px">We re-audited ${results.length} site${results.length === 1 ? "" : "s"}. Here's how they scored.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <a href="${app}/dashboard/progress" style="display:inline-block;margin-top:24px;background:#3552E6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">View progress →</a>
    <p style="color:#94A3B8;font-size:12px;margin-top:28px">You're receiving this because weekly audits are enabled for your workspace. Manage in Settings.</p>
  </div></body></html>`;

  return { to: owner.email, subject: `Your weekly BenchBot report — ${results.length} site${results.length === 1 ? "" : "s"}`, html };
}
