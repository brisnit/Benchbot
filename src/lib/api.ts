import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAudit, userInWorkspace } from "@/lib/db";
import type { Audit, User, Workspace } from "@/lib/types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Require an authenticated session in a route handler. */
export async function requireApiSession(): Promise<
  | { ok: true; user: User; workspace: Workspace }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: jsonError("You must be signed in.", 401) };
  }
  return { ok: true, user: session.user, workspace: session.workspace };
}

/** Require that the caller owns (via workspace membership) the given audit. */
export async function requireAuditAccess(
  auditId: string,
): Promise<{ ok: true; audit: Audit; user: User } | { ok: false; response: NextResponse }> {
  const session = await requireApiSession();
  if (!session.ok) return session;
  const audit = getAudit(auditId);
  if (!audit) return { ok: false, response: jsonError("Audit not found.", 404) };
  if (!userInWorkspace(session.user.id, audit.workspace_id)) {
    return { ok: false, response: jsonError("You don't have access to this audit.", 403) };
  }
  return { ok: true, audit, user: session.user };
}
