import { getStore } from "@/lib/store/local-store";
import { uid } from "@/lib/utils";
import type { AppComparisonRecord } from "@/lib/apps/record";
import { getPlan } from "@/lib/billing/plans";
import type {
  Audit,
  AuditBundle,
  AuditFinding,
  AuditScore,
  AuditStatus,
  Competitor,
  CrawlResult,
  Report,
  Role,
  Screenshot,
  Sitemap,
  User,
  Workspace,
  WorkspaceMember,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Data access layer. The whole app talks to the database through these
// functions only, so the underlying store (local file-backed JSON for the
// MVP, Supabase for production) can be swapped without touching callers.
// ─────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

// ---------- Users ----------

export function findUserByEmail(email: string): User | undefined {
  return getStore().db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
}

export function getUser(id: string): User | undefined {
  return getStore().db.users.find((u) => u.id === id);
}

export function createUser(email: string, name: string, passwordHash: string): User {
  const store = getStore();
  const user: User = {
    id: uid("usr_"),
    email,
    name,
    created_at: nowIso(),
  };
  store.db.users.push(user);
  store.db.passwords[user.id] = passwordHash;
  store.persist();
  return user;
}

export function verifyPassword(userId: string, passwordHash: string): boolean {
  return getStore().db.passwords[userId] === passwordHash;
}

// ---------- Workspaces ----------

export function createWorkspace(name: string, ownerId: string): Workspace {
  const store = getStore();
  const ws: Workspace = {
    id: uid("ws_"),
    name,
    owner_id: ownerId,
    plan: "guest",
    plan_cycle: "monthly",
    audits_used: 0,
    lifetime_audits: 0,
    period_start: nowIso(),
    created_at: nowIso(),
  };
  store.db.workspaces.push(ws);
  store.db.members.push({
    id: uid("mem_"),
    workspace_id: ws.id,
    user_id: ownerId,
    role: "owner",
    created_at: nowIso(),
  });
  store.persist();
  return ws;
}

export function getWorkspace(id: string): Workspace | undefined {
  return getStore().db.workspaces.find((w) => w.id === id);
}

export function listWorkspacesForUser(userId: string): Workspace[] {
  const store = getStore();
  const wsIds = new Set(
    store.db.members.filter((m) => m.user_id === userId).map((m) => m.workspace_id),
  );
  return store.db.workspaces.filter((w) => wsIds.has(w.id));
}

export function getPrimaryWorkspace(userId: string): Workspace | undefined {
  return listWorkspacesForUser(userId)[0];
}

export function listMembers(workspaceId: string): WorkspaceMember[] {
  return getStore().db.members.filter((m) => m.workspace_id === workspaceId);
}

export interface EnrichedMember {
  id: string;
  user_id: string;
  role: Role;
  name: string;
  email: string;
}

export function listMembersEnriched(workspaceId: string): EnrichedMember[] {
  return listMembers(workspaceId).map((m) => {
    const u = getUser(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      name: u?.name || u?.email || "Member",
      email: u?.email || "",
    };
  });
}

/** Invite (or no-op if already a member). Creates a lightweight user record for
 *  emails not yet registered so they appear on the roster. */
export function addMemberByEmail(
  workspaceId: string,
  email: string,
  role: Role = "editor",
): { ok: true; member: EnrichedMember } | { ok: false; error: string } {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const store = getStore();
  let user = findUserByEmail(normalized);
  if (!user) {
    user = {
      id: uid("usr_"),
      email: normalized,
      name: normalized.split("@")[0],
      created_at: nowIso(),
    };
    store.db.users.push(user);
  }
  const existing = store.db.members.find(
    (m) => m.workspace_id === workspaceId && m.user_id === user!.id,
  );
  if (existing) return { ok: false, error: "That person is already on the team." };

  const member: WorkspaceMember = {
    id: uid("mem_"),
    workspace_id: workspaceId,
    user_id: user.id,
    role,
    created_at: nowIso(),
  };
  store.db.members.push(member);
  store.persist();
  return {
    ok: true,
    member: { id: member.id, user_id: user.id, role, name: user.name || user.email, email: user.email },
  };
}

export function removeMember(workspaceId: string, memberId: string): void {
  const store = getStore();
  const m = store.db.members.find((x) => x.id === memberId && x.workspace_id === workspaceId);
  if (!m || m.role === "owner") return; // never remove the owner
  store.db.members = store.db.members.filter((x) => x.id !== memberId);
  store.persist();
}

export function updateWorkspace(id: string, patch: Partial<Workspace>): Workspace | undefined {
  const store = getStore();
  const ws = store.db.workspaces.find((w) => w.id === id);
  if (!ws) return undefined;
  Object.assign(ws, patch);
  store.persist();
  return ws;
}

// ---------- Usage & billing ----------

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export interface Usage {
  plan: string;
  cycle: "monthly" | "annual";
  limit: number; // Infinity for enterprise
  used: number;
  remaining: number;
  lifetime: number;
  unlimited: boolean;
  isGuest: boolean;
  renewsAt: string | null; // null for guest / enterprise
}

/** Compute usage for a workspace, rolling the monthly period if elapsed. */
export function getUsage(workspaceId: string): Usage {
  const store = getStore();
  const ws = store.db.workspaces.find((w) => w.id === workspaceId);
  const plan = getPlan(ws?.plan);
  const isGuest = plan.id === "guest";
  const unlimited = plan.audits === Infinity;

  if (!ws) {
    return { plan: plan.id, cycle: "monthly", limit: plan.audits, used: 0, remaining: plan.audits, lifetime: 0, unlimited, isGuest, renewsAt: null };
  }

  // Roll the monthly window for paid plans.
  if (!isGuest && !unlimited) {
    const start = ws.period_start ? new Date(ws.period_start).getTime() : 0;
    if (Date.now() - start > PERIOD_MS) {
      ws.period_start = nowIso();
      ws.audits_used = 0;
      store.persist();
    }
  }

  const lifetime = ws.lifetime_audits ?? 0;
  // Guest allowance is lifetime; paid plans are per-period.
  const used = isGuest ? lifetime : ws.audits_used ?? 0;
  const remaining = unlimited ? Infinity : Math.max(0, plan.audits - used);
  const renewsAt =
    isGuest || unlimited ? null : new Date((ws.period_start ? new Date(ws.period_start).getTime() : Date.now()) + PERIOD_MS).toISOString();

  return {
    plan: plan.id,
    cycle: (ws.plan_cycle as "monthly" | "annual") ?? "monthly",
    limit: plan.audits,
    used,
    remaining,
    lifetime,
    unlimited,
    isGuest,
    renewsAt,
  };
}

/** True if the workspace can start another audit. */
export function canRunAudit(workspaceId: string): boolean {
  return getUsage(workspaceId).remaining > 0;
}

/** Record one audit against the workspace's allowance. */
export function recordAuditUsage(workspaceId: string): void {
  const store = getStore();
  const ws = store.db.workspaces.find((w) => w.id === workspaceId);
  if (!ws) return;
  ws.audits_used = (ws.audits_used ?? 0) + 1;
  ws.lifetime_audits = (ws.lifetime_audits ?? 0) + 1;
  store.persist();
}

/** Change plan (mock checkout). Resets the usage period. */
export function setPlan(workspaceId: string, plan: string, cycle: "monthly" | "annual" = "monthly"): Workspace | undefined {
  const store = getStore();
  const ws = store.db.workspaces.find((w) => w.id === workspaceId);
  if (!ws) return undefined;
  ws.plan = plan;
  ws.plan_cycle = cycle;
  ws.audits_used = 0;
  ws.period_start = nowIso();
  store.persist();
  return ws;
}

/** Authorisation helper: is the user a member of the workspace? */
export function userInWorkspace(userId: string, workspaceId: string): boolean {
  return getStore().db.members.some(
    (m) => m.user_id === userId && m.workspace_id === workspaceId,
  );
}

// ---------- Audits ----------

export function createAudit(
  input: Omit<Audit, "id" | "created_at" | "updated_at" | "completed_at" | "progress">,
): Audit {
  const store = getStore();
  const audit: Audit = {
    ...input,
    id: uid("aud_"),
    progress: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    completed_at: null,
  };
  store.db.audits.push(audit);
  store.persist();
  return audit;
}

export function getAudit(id: string): Audit | undefined {
  return getStore().db.audits.find((a) => a.id === id);
}

export function listAudits(workspaceId: string): Audit[] {
  return getStore()
    .db.audits.filter((a) => a.workspace_id === workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function updateAudit(
  id: string,
  patch: Partial<Audit> & { status?: AuditStatus },
): Audit | undefined {
  const store = getStore();
  const audit = store.db.audits.find((a) => a.id === id);
  if (!audit) return undefined;
  Object.assign(audit, patch, { updated_at: nowIso() });
  if (patch.status === "complete") audit.completed_at = nowIso();
  store.persist();
  return audit;
}

export function deleteAudit(id: string): void {
  const store = getStore();
  const db = store.db;
  db.audits = db.audits.filter((a) => a.id !== id);
  db.competitors = db.competitors.filter((c) => c.audit_id !== id);
  db.crawlResults = db.crawlResults.filter((c) => c.audit_id !== id);
  db.screenshots = db.screenshots.filter((s) => s.audit_id !== id);
  db.sitemaps = db.sitemaps.filter((s) => s.audit_id !== id);
  db.scores = db.scores.filter((s) => s.audit_id !== id);
  db.findings = db.findings.filter((f) => f.audit_id !== id);
  db.reports = db.reports.filter((r) => r.audit_id !== id);
  store.persist();
}

// ---------- Competitors ----------

export function saveCompetitors(
  auditId: string,
  competitors: Omit<Competitor, "id" | "audit_id" | "created_at">[],
): Competitor[] {
  const store = getStore();
  // replace existing for this audit
  store.db.competitors = store.db.competitors.filter((c) => c.audit_id !== auditId);
  const created = competitors.map((c) => ({
    ...c,
    id: uid("cmp_"),
    audit_id: auditId,
    created_at: nowIso(),
  }));
  store.db.competitors.push(...created);
  store.persist();
  return created;
}

export function listCompetitors(auditId: string): Competitor[] {
  return getStore().db.competitors.filter((c) => c.audit_id === auditId);
}

// ---------- Bulk result writers (used by the audit runner) ----------

export function replaceCrawlResults(auditId: string, rows: CrawlResult[]): void {
  const store = getStore();
  store.db.crawlResults = store.db.crawlResults.filter((c) => c.audit_id !== auditId);
  store.db.crawlResults.push(...rows);
  store.persist();
}

export function replaceScreenshots(auditId: string, rows: Screenshot[]): void {
  const store = getStore();
  store.db.screenshots = store.db.screenshots.filter((s) => s.audit_id !== auditId);
  store.db.screenshots.push(...rows);
  store.persist();
}

export function replaceSitemaps(auditId: string, rows: Sitemap[]): void {
  const store = getStore();
  store.db.sitemaps = store.db.sitemaps.filter((s) => s.audit_id !== auditId);
  store.db.sitemaps.push(...rows);
  store.persist();
}

export function replaceScores(auditId: string, rows: AuditScore[]): void {
  const store = getStore();
  store.db.scores = store.db.scores.filter((s) => s.audit_id !== auditId);
  store.db.scores.push(...rows);
  store.persist();
}

export function replaceFindings(auditId: string, rows: AuditFinding[]): void {
  const store = getStore();
  store.db.findings = store.db.findings.filter((f) => f.audit_id !== auditId);
  store.db.findings.push(...rows);
  store.persist();
}

export function upsertReport(auditId: string, report: Omit<Report, "id" | "created_at" | "updated_at">): Report {
  const store = getStore();
  const existing = store.db.reports.find((r) => r.audit_id === auditId);
  if (existing) {
    Object.assign(existing, report, { updated_at: nowIso() });
    store.persist();
    return existing;
  }
  const created: Report = {
    ...report,
    id: uid("rep_"),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.db.reports.push(created);
  store.persist();
  return created;
}

// ---------- Hydration ----------

export function getReport(auditId: string): Report | null {
  return getStore().db.reports.find((r) => r.audit_id === auditId) ?? null;
}

// ---------- App comparisons ----------

export function createOrUpdateAppComparison(
  input: Omit<AppComparisonRecord, "id" | "created_at" | "updated_at">,
): AppComparisonRecord {
  const store = getStore();
  const key = [...input.apps.map((a) => a.id)].sort((a, b) => a - b).join(",");
  const existing = store.db.appComparisons.find(
    (r) =>
      r.workspace_id === input.workspace_id &&
      [...r.apps.map((a) => a.id)].sort((a, b) => a - b).join(",") === key,
  );
  if (existing) {
    Object.assign(existing, input, { updated_at: nowIso() });
    store.persist();
    return existing;
  }
  const record: AppComparisonRecord = {
    ...input,
    id: uid("app_"),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.db.appComparisons.push(record);
  store.persist();
  return record;
}

export function getAppComparison(id: string): AppComparisonRecord | undefined {
  return getStore().db.appComparisons.find((r) => r.id === id);
}

export function listAppComparisons(workspaceId: string): AppComparisonRecord[] {
  return getStore()
    .db.appComparisons.filter((r) => r.workspace_id === workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function deleteAppComparison(id: string): void {
  const store = getStore();
  store.db.appComparisons = store.db.appComparisons.filter((r) => r.id !== id);
  store.persist();
}

export function getAuditBundle(auditId: string): AuditBundle | null {
  const store = getStore();
  const audit = store.db.audits.find((a) => a.id === auditId);
  if (!audit) return null;
  return {
    audit,
    competitors: store.db.competitors.filter((c) => c.audit_id === auditId),
    scores: store.db.scores.filter((s) => s.audit_id === auditId),
    screenshots: store.db.screenshots.filter((s) => s.audit_id === auditId),
    sitemaps: store.db.sitemaps.filter((s) => s.audit_id === auditId),
    findings: store.db.findings.filter((f) => f.audit_id === auditId),
    crawlResults: store.db.crawlResults.filter((c) => c.audit_id === auditId),
    report: store.db.reports.find((r) => r.audit_id === auditId) ?? null,
  };
}
