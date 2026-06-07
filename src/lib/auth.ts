import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPasswordLite } from "@/lib/demo/hash";
import {
  createUser,
  createWorkspace,
  findUserByEmail,
  getPrimaryWorkspace,
  getUser,
  verifyPassword,
} from "@/lib/db";
import { ensureDemoSeed } from "@/lib/demo/seed";
import type { User, Workspace } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Lightweight cookie-based auth for the local/demo backend. When a real
// Supabase project is configured this layer can be swapped for Supabase
// Auth (see src/lib/supabase/*). The public API below is the same either way.
// ─────────────────────────────────────────────────────────────

const SESSION_COOKIE = "bb_session";

const hashPassword = hashPasswordLite;

export interface SessionContext {
  user: User;
  workspace: Workspace;
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = jar.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return getUser(userId) ?? null;
}

/** Returns the authed user + their primary workspace, or null. */
export async function getSession(): Promise<SessionContext | null> {
  ensureDemoSeed();
  const user = await getSessionUser();
  if (!user) return null;
  let workspace = getPrimaryWorkspace(user.id);
  if (!workspace) {
    workspace = createWorkspace(`${user.name ?? "My"}'s Workspace`, user.id);
  }
  return { user, workspace };
}

/** Use in server components / route handlers that require auth. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  workspaceName?: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  ensureDemoSeed();
  const normalizedEmail = email.trim().toLowerCase();
  if (findUserByEmail(normalizedEmail)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const user = createUser(normalizedEmail, name.trim(), hashPassword(password));
  createWorkspace(workspaceName?.trim() || `${name.trim() || "My"}'s Workspace`, user.id);
  await setSessionCookie(user.id);
  return { ok: true, user };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  ensureDemoSeed();
  const user = findUserByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(user.id, hashPassword(password))) {
    return { ok: false, error: "Incorrect email or password." };
  }
  await setSessionCookie(user.id);
  return { ok: true, user };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
