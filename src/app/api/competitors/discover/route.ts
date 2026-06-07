import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, jsonError } from "@/lib/api";
import { discoverCompetitors } from "@/lib/analysis/discover";
import { normalizeUrl } from "@/lib/utils";
import { SITE_TYPES, AUDIT_GOALS } from "@/lib/constants";

const schema = z.object({
  targetUrl: z.string().min(1),
  siteType: z.enum(SITE_TYPES.map((s) => s.value) as [string, ...string[]]),
  auditGoal: z.enum(AUDIT_GOALS.map((g) => g.value) as [string, ...string[]]),
});

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide a URL, site type and audit goal.");

  const url = normalizeUrl(parsed.data.targetUrl);
  if (!url) return jsonError("That doesn't look like a valid website URL.");

  const result = await discoverCompetitors({
    targetUrl: url,
    siteType: parsed.data.siteType as never,
    auditGoal: parsed.data.auditGoal as never,
  });

  return NextResponse.json(result);
}
