import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { appendElements, setBoardElements, getBoard } from "@/lib/board/store";
import { buildSeedElements } from "@/lib/board/seed";

export const dynamic = "force-dynamic";

// POST /api/board/seed { auditId, replace? } → lay an audit's findings onto the board.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { auditId?: string; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  if (!body.auditId) return jsonError("Missing auditId.");

  const bundle = getAuditBundle(body.auditId);
  if (!bundle) return jsonError("Audit not found.", 404);
  if (!userInWorkspace(session.user.id, bundle.audit.workspace_id)) {
    return jsonError("You don't have access to this audit.", 403);
  }

  const elements = buildSeedElements(bundle);
  const board = body.replace
    ? setBoardElements(session.workspace.id, elements, body.auditId)
    : appendElements(session.workspace.id, elements, body.auditId);

  // ensure a board exists in response
  getBoard(session.workspace.id);
  return NextResponse.json({ ok: true, board });
}
