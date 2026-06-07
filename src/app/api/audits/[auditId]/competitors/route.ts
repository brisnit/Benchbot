import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuditAccess, jsonError } from "@/lib/api";
import { listCompetitors, saveCompetitors } from "@/lib/db";
import { normalizeUrl, nameFromUrl } from "@/lib/utils";
import { MAX_COMPETITORS } from "@/lib/constants";

const competitorSchema = z.object({
  name: z.string().optional(),
  url: z.string().min(1),
  competitor_type: z.enum(["direct", "indirect", "inspiration", "custom"]).default("custom"),
  reason: z.string().optional(),
  selected: z.boolean().default(true),
});

const schema = z.object({
  competitors: z.array(competitorSchema),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;
  return NextResponse.json({ competitors: listCompetitors(auditId) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const { auditId } = await params;
  const access = await requireAuditAccess(auditId);
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid competitor list.");

  const selectedCount = parsed.data.competitors.filter((c) => c.selected).length;
  if (selectedCount > MAX_COMPETITORS) {
    return jsonError(`You can select up to ${MAX_COMPETITORS} competitors.`);
  }

  // Normalise URLs and drop invalid ones.
  const rows = parsed.data.competitors
    .map((c) => {
      const url = normalizeUrl(c.url);
      if (!url) return null;
      return {
        name: c.name?.trim() || nameFromUrl(url),
        url,
        competitor_type: c.competitor_type,
        reason: c.reason ?? "",
        selected: c.selected,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const saved = saveCompetitors(auditId, rows);
  return NextResponse.json({ competitors: saved });
}
