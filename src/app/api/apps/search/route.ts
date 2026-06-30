import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { searchApps } from "@/lib/apps/itunes";

export const dynamic = "force-dynamic";

// GET /api/apps/search?q=&country= → App Store search results.
export async function GET(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const country = (searchParams.get("country") || "us").trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });
  const results = await searchApps(q, country, 8);
  return NextResponse.json({ results });
}
