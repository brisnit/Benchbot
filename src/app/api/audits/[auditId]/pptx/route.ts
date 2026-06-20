import { NextRequest } from "next/server";
import { requireAuditAccess } from "@/lib/api";
import { getAuditBundle } from "@/lib/db";
import { buildAuditPptx } from "@/lib/report/pptx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "audit";
}

// GET → download the audit as a branded .pptx deck.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  const bundle = getAuditBundle(auditId);
  if (!bundle || !bundle.report) {
    return new Response("Report not ready for this audit.", { status: 404 });
  }

  const buf = await buildAuditPptx(bundle);
  const filename = `${slug(bundle.audit.target_name)}-benchbot-audit.pptx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
