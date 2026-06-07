// Centralised, typed access to environment configuration plus feature flags.
// Everything degrades gracefully: with no env set, BenchBot runs fully in
// local "demo" mode (mock auth, in-memory store, mock AI, no real crawling).

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  demoMode: process.env.DEMO_MODE === "true",
  enableRealCrawl: process.env.ENABLE_REAL_CRAWL === "true",
};

/** True when a real Supabase project is configured. */
export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** True when an OpenAI key is configured. */
export function hasOpenAI(): boolean {
  return Boolean(env.openaiKey);
}

/** Single source of truth for whether we use the local in-memory backend. */
export function isLocalMode(): boolean {
  return !hasSupabase();
}
