import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, jsonError } from "@/lib/api";
import { setPlan, getUsage } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

// POST /api/billing/plan { plan, cycle } → change plan (Stripe-ready; mocked for
// the MVP — no card is charged). Enterprise routes to sales instead.
export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  let body: { plan?: string; cycle?: "monthly" | "annual" };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const plan = getPlan(body.plan);
  if (plan.id === "enterprise") {
    return jsonError("Enterprise plans are set up with our sales team.", 400);
  }
  if (!body.plan || plan.id !== body.plan) {
    return jsonError("Unknown plan.");
  }

  setPlan(session.workspace.id, plan.id, body.cycle === "annual" ? "annual" : "monthly");
  return NextResponse.json({ ok: true, usage: getUsage(session.workspace.id) });
}
