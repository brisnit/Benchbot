import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { updatePresence } from "@/lib/board/store";
import { colorForUser } from "@/lib/board/types";

export const dynamic = "force-dynamic";

// POST /api/board/presence → publish this user's cursor; returns active peers.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { x?: number; y?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const presence = updatePresence(session.workspace.id, {
    userId: session.user.id,
    name: session.user.name || session.user.email,
    color: colorForUser(session.user.id),
    x: typeof body.x === "number" ? body.x : 0,
    y: typeof body.y === "number" ? body.y : 0,
  });

  return NextResponse.json({ presence });
}
