import { getStore } from "@/lib/store/local-store";
import type { Board, BoardElement, BoardOp, Presence } from "@/lib/board/types";

// ─────────────────────────────────────────────────────────────
// Board persistence (in the file-backed store) + ephemeral presence
// (in-memory only, never persisted). One board per workspace.
// ─────────────────────────────────────────────────────────────

const PRESENCE_TTL = 9000; // ms a cursor is considered "active"

// presence kept on a global singleton so it survives Next.js hot reloads
const globalForPresence = globalThis as unknown as {
  __benchbotPresence?: Map<string, Map<string, Presence>>;
};
function presenceStore(): Map<string, Map<string, Presence>> {
  if (!globalForPresence.__benchbotPresence) globalForPresence.__benchbotPresence = new Map();
  return globalForPresence.__benchbotPresence;
}

export function getBoard(workspaceId: string): Board {
  const store = getStore();
  let board = store.db.boards.find((b) => b.workspace_id === workspaceId);
  if (!board) {
    board = {
      id: workspaceId,
      workspace_id: workspaceId,
      elements: [],
      seeded_audit_id: null,
      updated_at: new Date().toISOString(),
    };
    store.db.boards.push(board);
    store.persist();
  }
  return board;
}

export function applyOps(workspaceId: string, ops: BoardOp[]): Board {
  const board = getBoard(workspaceId);
  for (const op of ops) {
    if (op.kind === "clear") {
      board.elements = [];
    } else if (op.kind === "delete") {
      board.elements = board.elements.filter((e) => e.id !== op.id);
    } else if (op.kind === "upsert") {
      const idx = board.elements.findIndex((e) => e.id === op.element.id);
      if (idx === -1) board.elements.push(op.element);
      else board.elements[idx] = op.element;
    }
  }
  board.updated_at = new Date().toISOString();
  getStore().persist();
  return board;
}

export function setBoardElements(workspaceId: string, elements: BoardElement[], seededAuditId?: string): Board {
  const board = getBoard(workspaceId);
  board.elements = elements;
  if (seededAuditId !== undefined) board.seeded_audit_id = seededAuditId;
  board.updated_at = new Date().toISOString();
  getStore().persist();
  return board;
}

export function appendElements(workspaceId: string, elements: BoardElement[], seededAuditId?: string): Board {
  const board = getBoard(workspaceId);
  board.elements = [...board.elements, ...elements];
  if (seededAuditId !== undefined) board.seeded_audit_id = seededAuditId;
  board.updated_at = new Date().toISOString();
  getStore().persist();
  return board;
}

// ---------- presence ----------

export function updatePresence(workspaceId: string, p: Omit<Presence, "lastSeen">): Presence[] {
  const all = presenceStore();
  if (!all.has(workspaceId)) all.set(workspaceId, new Map());
  const ws = all.get(workspaceId)!;
  ws.set(p.userId, { ...p, lastSeen: Date.now() });
  return activePresences(workspaceId);
}

export function activePresences(workspaceId: string): Presence[] {
  const ws = presenceStore().get(workspaceId);
  if (!ws) return [];
  const now = Date.now();
  const out: Presence[] = [];
  for (const [id, p] of ws) {
    if (now - p.lastSeen > PRESENCE_TTL) ws.delete(id);
    else out.push(p);
  }
  return out;
}
