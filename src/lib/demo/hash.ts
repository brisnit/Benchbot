import crypto from "node:crypto";

// Shared lightweight password hash used by both the auth layer and the demo
// seeder. Kept in its own module to avoid a circular import between
// auth.ts and seed.ts. NOTE: this is sufficient for the local mock backend
// only — production auth is delegated to Supabase Auth.
export function hashPasswordLite(password: string): string {
  return crypto.createHash("sha256").update(`benchbot:${password}`).digest("hex");
}
