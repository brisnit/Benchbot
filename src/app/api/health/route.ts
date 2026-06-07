import { NextResponse } from "next/server";
import { hasOpenAI } from "@/lib/env";
import { env } from "@/lib/env";

// Lightweight health check for Railway's deploy healthcheck and uptime pings.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "benchbot",
    realCrawl: env.enableRealCrawl,
    aiEnabled: hasOpenAI(),
    demoMode: env.demoMode,
    time: new Date().toISOString(),
  });
}
