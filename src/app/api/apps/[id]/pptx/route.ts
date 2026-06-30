import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/api";
import { getAppComparison, userInWorkspace } from "@/lib/db";
import { buildAppComparisonPptx } from "@/lib/report/pptx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apps";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const rec = getAppComparison(id);
  if (!rec || !userInWorkspace(session.user.id, rec.workspace_id)) {
    return new Response("Not found", { status: 404 });
  }

  const buf = await buildAppComparisonPptx(rec);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${slug(rec.target_name)}-app-benchmark.pptx"`,
      "Cache-Control": "no-store",
    },
  });
}
