import { NextRequest, NextResponse } from "next/server";
import { requireAuditAccess } from "@/lib/api";
import { deleteAudit, getAuditBundle } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  const bundle = getAuditBundle(auditId);
  if (!bundle) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  return NextResponse.json(bundle);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  deleteAudit(auditId);
  return NextResponse.json({ ok: true });
}
