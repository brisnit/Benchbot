import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listAllWorkspaces } from "@/lib/db";
import { runWeeklyForWorkspace, weeklyEmail, weeklyEligible } from "@/lib/weekly";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Weekly automated audits. Point a Railway Cron (or any scheduler) at this URL.
// Secure it with CRON_SECRET (sent as `Authorization: Bearer <secret>` or `?key=`).
async function handle(req: NextRequest) {
  if (env.cronSecret) {
    const auth = req.headers.get("authorization");
    const key = new URL(req.url).searchParams.get("key");
    if (auth !== `Bearer ${env.cronSecret}` && key !== env.cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ran: { workspace: string; sites: number; emailed: boolean }[] = [];
  for (const ws of listAllWorkspaces()) {
    if (!ws.weekly_enabled || !weeklyEligible(ws.plan)) continue;
    const results = await runWeeklyForWorkspace(ws.id);
    const mail = weeklyEmail(ws.id, results);
    const emailed = mail ? await sendEmail(mail) : false;
    ran.push({ workspace: ws.id, sites: results.length, emailed });
  }
  return NextResponse.json({ ok: true, ran });
}

export const GET = handle;
export const POST = handle;
