import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { getAuditBundle, getAppComparison, userInWorkspace } from "@/lib/db";
import { appendElements, setBoardElements, getBoard } from "@/lib/board/store";
import { buildSeedElements, buildAppSeedElements } from "@/lib/board/seed";
import type { BoardElement } from "@/lib/board/types";

export const dynamic = "force-dynamic";

// POST /api/board/seed { id|auditId, kind?, replace? } → lay a web audit OR an
// app comparison onto the board.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { id?: string; auditId?: string; kind?: "web" | "app"; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const id = body.id || body.auditId;
  if (!id) return jsonError("Missing id.");

  let elements: BoardElement[];

  if (body.kind === "app") {
    const rec = getAppComparison(id);
    if (!rec) return jsonError("Comparison not found.", 404);
    if (!userInWorkspace(session.user.id, rec.workspace_id)) return jsonError("No access.", 403);
    elements = buildAppSeedElements(rec);
  } else {
    const bundle = getAuditBundle(id);
    if (!bundle) return jsonError("Audit not found.", 404);
    if (!userInWorkspace(session.user.id, bundle.audit.workspace_id)) return jsonError("No access.", 403);
    elements = buildSeedElements(bundle);
  }

  const board = body.replace
    ? setBoardElements(session.workspace.id, elements, id)
    : appendElements(session.workspace.id, elements, id);

  getBoard(session.workspace.id);
  return NextResponse.json({ ok: true, board });
}
