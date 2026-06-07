import fs from "node:fs";
import path from "node:path";
import type {
  Audit,
  AuditFinding,
  AuditScore,
  Competitor,
  CrawlResult,
  Report,
  Screenshot,
  Sitemap,
  User,
  Workspace,
  WorkspaceMember,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// File-backed, in-memory data store used in local / demo mode.
// Persists to .data/db.json so audits survive dev server reloads and
// page navigations. Falls back to pure in-memory if the FS is read-only
// (e.g. some serverless targets). A module-level global keeps a single
// instance across Next.js hot reloads.
// ─────────────────────────────────────────────────────────────

export interface DbShape {
  users: User[];
  workspaces: Workspace[];
  members: WorkspaceMember[];
  audits: Audit[];
  competitors: Competitor[];
  crawlResults: CrawlResult[];
  screenshots: Screenshot[];
  sitemaps: Sitemap[];
  scores: AuditScore[];
  findings: AuditFinding[];
  reports: Report[];
  // userId -> lightweight password hash (local mock auth only)
  passwords: Record<string, string>;
}

function emptyDb(): DbShape {
  return {
    users: [],
    workspaces: [],
    members: [],
    audits: [],
    competitors: [],
    crawlResults: [],
    screenshots: [],
    sitemaps: [],
    scores: [],
    findings: [],
    reports: [],
    passwords: {},
  };
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

class LocalStore {
  db: DbShape;
  private canPersist = true;

  constructor() {
    this.db = this.load();
  }

  private load(): DbShape {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf8");
        const parsed = JSON.parse(raw) as Partial<DbShape>;
        return { ...emptyDb(), ...parsed };
      }
    } catch {
      this.canPersist = false;
    }
    return emptyDb();
  }

  persist(): void {
    if (!this.canPersist) return;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), "utf8");
    } catch {
      this.canPersist = false;
    }
  }
}

// Persist a singleton across hot reloads in dev.
const globalForStore = globalThis as unknown as { __benchbotStore?: LocalStore };

export function getStore(): LocalStore {
  if (!globalForStore.__benchbotStore) {
    globalForStore.__benchbotStore = new LocalStore();
  }
  return globalForStore.__benchbotStore;
}
