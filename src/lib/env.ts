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
  // LiveKit (audio calls). When unset, the workspace call falls back to a
  // peer-to-peer mesh (good for small groups, STUN-only).
  livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "",
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
  // Email (weekly summaries) via Resend. When unset, summaries are logged only.
  resendKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM || "BenchBot <onboarding@resend.dev>",
  // Shared secret to authorise the weekly cron endpoint.
  cronSecret: process.env.CRON_SECRET ?? "",
};

/** True when a real Supabase project is configured. */
export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** True when an OpenAI key is configured. */
export function hasOpenAI(): boolean {
  return Boolean(env.openaiKey);
}

/** True when LiveKit is fully configured (SFU + TURN for large calls). */
export function hasLiveKit(): boolean {
  return Boolean(env.livekitUrl && env.livekitApiKey && env.livekitApiSecret);
}

/** True when an email provider (Resend) is configured. */
export function hasEmail(): boolean {
  return Boolean(env.resendKey);
}

/** Single source of truth for whether we use the local in-memory backend. */
export function isLocalMode(): boolean {
  return !hasSupabase();
}
