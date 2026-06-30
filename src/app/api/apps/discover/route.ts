import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { lookupApps } from "@/lib/apps/itunes";
import { discoverCompetitorApps } from "@/lib/apps/discover";

export const dynamic = "force-dynamic";

// POST /api/apps/discover { id:number, country? } → competitor apps for one app.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { id?: number; country?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  if (typeof body.id !== "number") return jsonError("Pick an app first.");

  const country = (body.country || "us").toLowerCase();
  const [target] = await lookupApps([body.id], country);
  if (!target) return jsonError("Couldn't load that app.", 502);

  const result = await discoverCompetitorApps(target, country);
  return NextResponse.json(result);
}
