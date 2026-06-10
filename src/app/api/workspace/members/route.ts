import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { addMemberByEmail, listMembersEnriched, removeMember } from "@/lib/db";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET → current team roster.
export async function GET() {
  const session = await requireApiSession();
  if (!session.ok) return session.response;
  return NextResponse.json({ members: listMembersEnriched(session.workspace.id) });
}

// POST { email, role? } → invite a teammate.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;
  let body: { email?: string; role?: Role };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  if (!body.email) return jsonError("Email is required.");
  const result = addMemberByEmail(session.workspace.id, body.email, body.role ?? "editor");
  if (!result.ok) return jsonError(result.error);
  return NextResponse.json({ member: result.member, members: listMembersEnriched(session.workspace.id) });
}

// DELETE { memberId } → remove a teammate.
export async function DELETE(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;
  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  if (!body.memberId) return jsonError("memberId is required.");
  removeMember(session.workspace.id, body.memberId);
  return NextResponse.json({ members: listMembersEnriched(session.workspace.id) });
}
