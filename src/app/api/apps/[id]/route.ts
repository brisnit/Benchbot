import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { getAppComparison, deleteAppComparison, userInWorkspace } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/apps/[id] → remove a saved app comparison.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const rec = getAppComparison(id);
  if (!rec) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!userInWorkspace(session.user.id, rec.workspace_id)) {
    return NextResponse.json({ error: "No access." }, { status: 403 });
  }

  deleteAppComparison(id);
  return NextResponse.json({ ok: true });
}
