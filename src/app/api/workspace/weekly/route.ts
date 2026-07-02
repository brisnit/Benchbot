import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { setWeeklyEnabled, getWorkspace } from "@/lib/db";
import { runWeeklyForWorkspace, weeklyEmail, weeklyEligible } from "@/lib/weekly";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST { enabled } → toggle weekly automated audits (Pro/Agency only).
// POST { run: true } → run the weekly audits now for this workspace.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const ws = getWorkspace(session.workspace.id);
  if (!weeklyEligible(ws?.plan)) {
    return jsonError("Weekly automated audits are available on Professional and Agency.", 403);
  }

  let body: { enabled?: boolean; run?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  if (body.run) {
    const results = await runWeeklyForWorkspace(session.workspace.id);
    const mail = weeklyEmail(session.workspace.id, results);
    const emailed = mail ? await sendEmail(mail) : false;
    return NextResponse.json({ ok: true, ran: results.length, emailed, results });
  }

  const updated = setWeeklyEnabled(session.workspace.id, Boolean(body.enabled));
  return NextResponse.json({ ok: true, enabled: updated?.weekly_enabled ?? false });
}
