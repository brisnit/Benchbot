import { NextRequest, NextResponse } from "next/server";
import { requireAuditAccess, jsonError } from "@/lib/api";
import { listCompetitors, updateAudit } from "@/lib/db";
import { runAudit } from "@/lib/runner";
import { isRunning } from "@/lib/audit-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  if (isRunning(access.audit.status)) {
    return NextResponse.json({ ok: true, status: access.audit.status, already: true });
  }

  const competitors = listCompetitors(auditId).filter((c) => c.selected);
  if (competitors.length === 0) {
    return jsonError("Select at least one competitor before running the audit.");
  }

  // Mark as started immediately, then run the pipeline in the background.
  updateAudit(auditId, { status: "finding_competitors", progress: 4, error: null });
  // Fire-and-forget: the run screen polls /status for progress.
  void runAudit(auditId);

  return NextResponse.json({ ok: true, status: "finding_competitors" });
}
