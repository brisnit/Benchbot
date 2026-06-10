import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { getBoard, activePresences } from "@/lib/board/store";

export const dynamic = "force-dynamic";

// GET /api/board → current board + active collaborators for the user's workspace.
export async function GET() {
  const session = await requireApiSession();
  if (!session.ok) return session.response;
  const board = getBoard(session.workspace.id);
  return NextResponse.json({
    board,
    presence: activePresences(session.workspace.id),
    you: { id: session.user.id, name: session.user.name || session.user.email },
  });
}
