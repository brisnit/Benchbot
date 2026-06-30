import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { lookupApps } from "@/lib/apps/itunes";
import { analyzeApps } from "@/lib/apps/analyze";

export const dynamic = "force-dynamic";

// POST /api/apps/compare { ids:number[], targetId:number, country? }
// → fetches each app + an AI/heuristic comparison.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { ids?: number[]; targetId?: number; country?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  const ids = (body.ids ?? []).filter((n) => typeof n === "number").slice(0, 8);
  if (ids.length < 1) return jsonError("Pick at least one app.");

  const apps = await lookupApps(ids, (body.country || "us").toLowerCase());
  if (!apps.length) return jsonError("Couldn't load those apps. Try again.", 502);

  const target = apps.find((a) => a.id === body.targetId) ?? apps[0];
  const competitors = apps.filter((a) => a.id !== target.id);
  const comparison = await analyzeApps(target, competitors);

  return NextResponse.json({ target, competitors, apps, comparison });
}
