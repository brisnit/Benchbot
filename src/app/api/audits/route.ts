import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, jsonError } from "@/lib/api";
import { createAudit, listAudits, getUsage, recordAuditUsage } from "@/lib/db";
import { normalizeUrl, nameFromUrl } from "@/lib/utils";
import { SITE_TYPES, AUDIT_GOALS, CRAWL_OPTIONS, DEVICE_MODES } from "@/lib/constants";
import type { AuditGoal, DeviceMode, SiteType } from "@/lib/types";

const schema = z.object({
  targetUrl: z.string().min(1),
  siteType: z.enum(SITE_TYPES.map((s) => s.value) as [string, ...string[]]),
  auditGoal: z.enum(AUDIT_GOALS.map((g) => g.value) as [string, ...string[]]),
  deviceMode: z.enum(DEVICE_MODES.map((d) => d.value) as [string, ...string[]]).default("both"),
  crawlSettings: z.array(z.enum(CRAWL_OPTIONS.map((c) => c.value) as [string, ...string[]])).default([]),
});

export async function GET() {
  const session = await requireApiSession();
  if (!session.ok) return session.response;
  return NextResponse.json({ audits: listAudits(session.workspace.id) });
}

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
  if (!parsed.success) return jsonError("Missing or invalid audit details.");

  const url = normalizeUrl(parsed.data.targetUrl);
  if (!url) return jsonError("That doesn't look like a valid website URL.");

  // Enforce the plan's audit allowance.
  const usage = getUsage(session.workspace.id);
  if (usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: usage.isGuest
          ? "You've used your 2 free BenchBot audits."
          : "You've reached your plan's monthly audit limit.",
        upgrade: true,
        usage,
      },
      { status: 402 },
    );
  }

  const audit = createAudit({
    workspace_id: session.workspace.id,
    user_id: session.user.id,
    target_url: url,
    target_name: nameFromUrl(url),
    site_type: parsed.data.siteType as SiteType,
    audit_goal: parsed.data.auditGoal as AuditGoal,
    device_mode: parsed.data.deviceMode as DeviceMode,
    crawl_settings: parsed.data.crawlSettings.length
      ? parsed.data.crawlSettings
      : ["homepage", "navigation", "footer"],
    status: "draft",
    error: null,
  });

  recordAuditUsage(session.workspace.id);

  return NextResponse.json({ audit, usage: getUsage(session.workspace.id) }, { status: 201 });
}
