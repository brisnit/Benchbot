import { env } from "@/lib/env";
import { getStore } from "@/lib/store/local-store";
import { hashPasswordLite } from "@/lib/demo/hash";
import { generateAuditData } from "@/lib/demo/generate";
import { uid } from "@/lib/utils";
import type {
  Audit,
  Competitor,
  User,
  Workspace,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Seeds a demo user + workspace + a fully-populated sample audit so the
// UI can be reviewed end-to-end without running real crawls. Idempotent:
// guarded by a flag in the store. Only runs when DEMO_MODE=true.
// ─────────────────────────────────────────────────────────────

export const DEMO_EMAIL = "demo@benchbot.app";
export const DEMO_PASSWORD = "benchbot";

let seeded = false;

export function ensureDemoSeed(): void {
  if (!env.demoMode || seeded) return;
  const store = getStore();
  // already seeded in a previous process (file-backed)?
  if (store.db.users.some((u) => u.email === DEMO_EMAIL)) {
    seeded = true;
    return;
  }

  const now = new Date();
  const user: User = {
    id: "usr_demo",
    email: DEMO_EMAIL,
    name: "Demo Strategist",
    created_at: now.toISOString(),
  };
  store.db.users.push(user);
  store.db.passwords[user.id] = hashPasswordLite(DEMO_PASSWORD);

  const workspace: Workspace = {
    id: "ws_demo",
    name: "Northstar Agency",
    owner_id: user.id,
    plan: "agency",
    plan_cycle: "monthly",
    audits_used: 37,
    lifetime_audits: 214,
    period_start: now.toISOString(),
    created_at: now.toISOString(),
  };
  store.db.workspaces.push(workspace);
  store.db.members.push({
    id: uid("mem_"),
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
    created_at: now.toISOString(),
  });

  // A completed sample audit.
  const created = new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString();
  const audit: Audit = {
    id: "aud_demo",
    workspace_id: workspace.id,
    user_id: user.id,
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
  store.db.audits.push(audit);

  const competitors: Competitor[] = [
    {
      id: "cmp_1",
      audit_id: audit.id,
      name: "Vercel",
      url: "https://vercel.com",
      competitor_type: "direct",
      reason: "Closest direct competitor on developer-platform positioning.",
      selected: true,
      created_at: created,
    },
    {
      id: "cmp_2",
      audit_id: audit.id,
      name: "Netlify",
      url: "https://netlify.com",
      competitor_type: "direct",
      reason: "Overlapping audience and pricing model.",
      selected: true,
      created_at: created,
    },
    {
      id: "cmp_3",
      audit_id: audit.id,
      name: "Linear",
      url: "https://linear.app",
      competitor_type: "inspiration",
      reason: "Best-in-class marketing site craft and clarity.",
      selected: true,
      created_at: created,
    },
  ];
  store.db.competitors.push(...competitors);

  const data = generateAuditData(audit, competitors);
  store.db.crawlResults.push(...data.crawlResults);
  store.db.screenshots.push(...data.screenshots);
  store.db.sitemaps.push(...data.sitemaps);
  store.db.scores.push(...data.scores);
  store.db.findings.push(...data.findings);
  store.db.reports.push({
    ...data.report,
    id: "rep_demo",
    created_at: created,
    updated_at: created,
  });

  store.persist();
  seeded = true;
}
