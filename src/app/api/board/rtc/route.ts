import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { rtcHeartbeat, rtcEnqueue, rtcDrain } from "@/lib/board/rtc";

export const dynamic = "force-dynamic";

// Single endpoint that the audio client polls: heartbeats call presence, sends
// any queued signalling messages, and drains this user's inbox.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { inCall?: boolean; muted?: boolean; signals?: { to: string; data: unknown }[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const ws = session.workspace.id;
  const me = session.user.id;
  const name = session.user.name || session.user.email;

  const participants = rtcHeartbeat(ws, me, name, Boolean(body.muted), Boolean(body.inCall));

  if (Array.isArray(body.signals)) {
    for (const s of body.signals) {
      if (s && typeof s.to === "string") rtcEnqueue(ws, me, s.to, s.data);
    }
  }

  const inbox = rtcDrain(ws, me);
  return NextResponse.json({ participants, inbox, you: me });
}
