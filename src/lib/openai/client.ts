import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";

let client: OpenAI | null = null;

/** Returns a configured OpenAI client, or null when no key is set. */
export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI()) return null;
  if (!client) client = new OpenAI({ apiKey: env.openaiKey });
  return client;
}
