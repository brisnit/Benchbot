import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Browser-side Supabase client. Only used when a real Supabase project is
// configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). In local/demo mode the
// app never calls this.
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
