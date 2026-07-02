import { NextRequest, NextResponse } from "next/server";
import { requireAuditAccess } from "@/lib/api";
import { getOrCreateTasks, toggleTask } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET → the audit's improvement tasks (generated on first access).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;
  return NextResponse.json({ tasks: getOrCreateTasks(auditId) });
}

// POST { taskId } → toggle a task's completed state.
export async function POST(req: NextRequest, { params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;
  let body: { taskId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  const task = toggleTask(auditId, body.taskId);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task });
}
