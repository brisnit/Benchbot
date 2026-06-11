// In-memory WebRTC signaling for the workspace audio call. Per-workspace call
// presence + per-recipient message mailboxes. Ephemeral (never persisted) and
// kept on a global singleton so it survives Next.js hot reloads.

interface CallPeer {
  userId: string;
  name: string;
  muted: boolean;
  hand: boolean;
  lastSeen: number;
}
export interface Signal {
  from: string;
  data: unknown;
}

const TTL = 7000; // ms before an idle participant is dropped

const g = globalThis as unknown as {
  __bbRtc?: { peers: Map<string, Map<string, CallPeer>>; inbox: Map<string, Map<string, Signal[]>> };
};
function store() {
  if (!g.__bbRtc) g.__bbRtc = { peers: new Map(), inbox: new Map() };
  return g.__bbRtc;
}

export interface Participant {
  id: string;
  name: string;
  muted: boolean;
  hand: boolean;
}

export function rtcHeartbeat(
  ws: string,
  userId: string,
  name: string,
  muted: boolean,
  hand: boolean,
  inCall: boolean,
): Participant[] {
  const m = store();
  if (!m.peers.has(ws)) m.peers.set(ws, new Map());
  const room = m.peers.get(ws)!;
  if (inCall) room.set(userId, { userId, name, muted, hand, lastSeen: Date.now() });
  else room.delete(userId);
  return rtcParticipants(ws);
}

export function rtcParticipants(ws: string): Participant[] {
  const room = store().peers.get(ws);
  if (!room) return [];
  const now = Date.now();
  const out: Participant[] = [];
  for (const [id, p] of room) {
    if (now - p.lastSeen > TTL) room.delete(id);
    else out.push({ id: p.userId, name: p.name, muted: p.muted, hand: p.hand });
  }
  return out;
}

export function rtcEnqueue(ws: string, from: string, to: string, data: unknown) {
  const m = store();
  if (!m.inbox.has(ws)) m.inbox.set(ws, new Map());
  const box = m.inbox.get(ws)!;
  if (!box.has(to)) box.set(to, []);
  box.get(to)!.push({ from, data });
}

export function rtcDrain(ws: string, userId: string): Signal[] {
  const box = store().inbox.get(ws);
  if (!box) return [];
  const q = box.get(userId) ?? [];
  box.set(userId, []);
  return q;
}
