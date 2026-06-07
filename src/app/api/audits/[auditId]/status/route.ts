import { NextRequest, NextResponse } from "next/server";
import { requireAuditAccess } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/audit-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  const { audit } = access;
  return NextResponse.json({
    id: audit.id,
    status: audit.status,
    label: STATUS_LABELS[audit.status],
    progress: audit.progress,
    error: audit.error ?? null,
    completed_at: audit.completed_at ?? null,
  });
}
