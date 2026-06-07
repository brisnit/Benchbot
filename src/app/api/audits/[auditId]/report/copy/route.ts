import { NextRequest, NextResponse } from "next/server";
import { requireAuditAccess, jsonError } from "@/lib/api";
import { getReport } from "@/lib/db";

// Optional helper: returns report content for copy/export. `part` query param
// selects "summary" (default) or "full" markdown.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  const report = getReport(auditId);
  if (!report) return jsonError("This audit doesn't have a report yet.", 404);

  const part = new URL(req.url).searchParams.get("part") ?? "summary";
  const content = part === "full" ? report.full_report_markdown : report.executive_summary;

  return NextResponse.json({ part, content });
}
