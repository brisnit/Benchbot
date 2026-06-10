import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { applyOps } from "@/lib/board/store";
import type { BoardOp } from "@/lib/board/types";

export const dynamic = "force-dynamic";

// POST /api/board/ops → apply a batch of board operations (upsert/delete/clear).
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { ops?: BoardOp[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  if (!Array.isArray(body.ops)) return jsonError("Missing ops.");

  // Stamp the editor onto every upsert for presence/attribution.
  const ops = body.ops.map((op) =>
    op.kind === "upsert"
      ? { ...op, element: { ...op.element, updated_by: session.user.id } }
      : op,
  );

  const board = applyOps(session.workspace.id, ops as BoardOp[]);
  return NextResponse.json({ ok: true, updated_at: board.updated_at });
}
