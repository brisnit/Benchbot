import { getOpenAI } from "@/lib/openai/client";
import { env } from "@/lib/env";
import { discoverResponseSchema, type DiscoverResponse } from "@/lib/analysis/schema";
import { hostFromUrl, nameFromUrl, normalizeUrl } from "@/lib/utils";
import type { AuditGoal, SiteType } from "@/lib/types";
import { auditGoalLabel, siteTypeLabel } from "@/lib/constants";

export interface DiscoverInput {
  targetUrl: string;
  siteType: SiteType;
  auditGoal: AuditGoal;
}

/** How the suggestions were produced — drives honest labelling in the UI. */
export type DiscoverSource = "web_search" | "ai_estimate" | "sample";

export interface DiscoverResult extends DiscoverResponse {
  source: DiscoverSource;
  /** Kept for backwards compatibility: true unless verified via live web search. */
  aiEstimated: boolean;
  /** Short note about how the company was understood (target context). */
  targetSummary?: string;
}

// Curated, realistic competitor pools per site type so demo/no-key mode still
// produces recognisable, plausible suggestions. Clearly labelled as a sample.
const POOLS: Record<SiteType, { direct: string[]; indirect: string[]; inspiration: string[] }> = {
  saas: {
    direct: ["vercel.com", "netlify.com", "render.com"],
    indirect: ["heroku.com", "digitalocean.com"],
    inspiration: ["linear.app", "stripe.com", "framer.com"],
  },
  ecommerce: {
    direct: ["shopify.com", "bigcommerce.com", "squarespace.com"],
    indirect: ["wix.com", "etsy.com"],
    inspiration: ["allbirds.com", "glossier.com", "apple.com"],
  },
  b2b: {
    direct: ["salesforce.com", "hubspot.com", "zoominfo.com"],
    indirect: ["pipedrive.com", "monday.com"],
    inspiration: ["stripe.com", "linear.app", "notion.so"],
  },
  nonprofit: {
    direct: ["charitywater.org", "redcross.org", "worldwildlife.org"],
    indirect: ["gofundme.com", "donorbox.org"],
    inspiration: ["pencilsofpromise.org", "watsi.org"],
  },
  education: {
    direct: ["coursera.org", "udemy.com", "edx.org"],
    indirect: ["khanacademy.org", "duolingo.com"],
    inspiration: ["masterclass.com", "brilliant.org"],
  },
  healthcare: {
    direct: ["zocdoc.com", "teladoc.com", "onemedical.com"],
    indirect: ["goodrx.com", "healthline.com"],
    inspiration: ["ro.co", "hims.com"],
  },
  hospitality: {
    direct: ["booking.com", "expedia.com", "hotels.com"],
    indirect: ["airbnb.com", "tripadvisor.com"],
    inspiration: ["airbnb.com", "marriott.com"],
  },
  marketplace: {
    direct: ["etsy.com", "ebay.com", "fiverr.com"],
    indirect: ["amazon.com", "upwork.com"],
    inspiration: ["airbnb.com", "reverb.com"],
  },
  other: {
    direct: ["example-competitor-a.com", "example-competitor-b.com"],
    indirect: ["example-adjacent.com"],
    inspiration: ["stripe.com", "linear.app"],
  },
};

function sampleDiscover(input: DiscoverInput, targetSummary?: string): DiscoverResult {
  const host = hostFromUrl(input.targetUrl);
  const pool = POOLS[input.siteType] ?? POOLS.other;
  const exclude = (urls: string[]) =>
    urls
      .filter((u) => hostFromUrl(u) !== host)
      .map((u) => ({ name: nameFromUrl(u), url: `https://${u}` }));

  const reasonFor = (kind: string) =>
    `Sample ${kind} for a ${siteTypeLabel(input.siteType)} running a ${auditGoalLabel(input.auditGoal)}.`;

  return {
    source: "sample",
    aiEstimated: true,
    targetSummary,
    directCompetitors: exclude(pool.direct).map((c) => ({ ...c, reason: reasonFor("direct competitor") })),
    indirectCompetitors: exclude(pool.indirect).map((c) => ({ ...c, reason: reasonFor("indirect competitor") })),
    inspirationSites: exclude(pool.inspiration).map((c) => ({ ...c, reason: reasonFor("best-in-class inspiration site") })),
  };
}

// ── Grounding: fetch the target homepage and extract a plain-text summary ──
// Lightweight HTML fetch (no Playwright) so discovery is grounded in what the
// company ACTUALLY does, not just its domain name. Fast and best-effort.
async function fetchTargetContext(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; BenchBotBot/1.0)" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 200_000);

    const pick = (re: RegExp) => (html.match(re)?.[1] ?? "").trim();
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc =
      pick(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
      pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i);
    const ogSite = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([\s\S]*?)["']/i);
    const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, " ");

    const parts = [
      ogSite && `Brand: ${ogSite}`,
      title && `Title: ${title}`,
      h1 && `Headline: ${h1}`,
      desc && `Description: ${desc}`,
    ]
      .filter(Boolean)
      .join("\n")
      .replace(/\s+/g, " ")
      .trim();
    return parts.slice(0, 800);
  } catch {
    return "";
  }
}

/** Robustly extract the first JSON object from a model response that may
 *  include prose, markdown fences or citations. */
function extractJson(text: string): unknown | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function instructions(input: DiscoverInput, context: string): string {
  return [
    `Identify real, currently-operating competitors of the company at ${input.targetUrl}.`,
    context
      ? `What the company does (from its homepage):\n${context}`
      : `Site type: ${siteTypeLabel(input.siteType)}.`,
    `Audit goal context: ${auditGoalLabel(input.auditGoal)}.`,
    "",
    "Return:",
    "- 3 DIRECT competitors: same core product, same target audience.",
    "- 2 INDIRECT competitors: adjacent or substitute solutions.",
    "- 3 INSPIRATION sites: best-in-class UX in or near this space to learn from.",
    "",
    "Rules:",
    `- Exclude the target company itself (${hostFromUrl(input.targetUrl)}).`,
    "- Use REAL companies with real homepage URLs (https). Do not invent domains.",
    "- Each reason must be one sentence describing what that company does and why it's relevant.",
    "",
    'Respond with ONLY a JSON object, no prose: {"directCompetitors":[{"name","url","reason"}],"indirectCompetitors":[...],"inspirationSites":[...]}',
  ].join("\n");
}

function normalizeResult(
  parsed: DiscoverResponse,
  input: DiscoverInput,
  source: DiscoverSource,
  targetSummary: string,
): DiscoverResult {
  const fix = (arr: DiscoverResponse["directCompetitors"]) =>
    arr
      .map((c) => ({ ...c, url: normalizeUrl(c.url) ?? c.url, name: c.name || nameFromUrl(c.url) }))
      .filter((c) => hostFromUrl(c.url) !== hostFromUrl(input.targetUrl))
      // de-dupe by host within each list
      .filter((c, i, all) => all.findIndex((o) => hostFromUrl(o.url) === hostFromUrl(c.url)) === i);
  return {
    source,
    aiEstimated: source !== "web_search",
    targetSummary: targetSummary || undefined,
    directCompetitors: fix(parsed.directCompetitors),
    indirectCompetitors: fix(parsed.indirectCompetitors),
    inspirationSites: fix(parsed.inspirationSites),
  };
}

function hasAny(r: DiscoverResponse): boolean {
  return (
    r.directCompetitors.length + r.indirectCompetitors.length + r.inspirationSites.length > 0
  );
}

// ── 1. Live web search (OpenAI Responses API + web_search tool) ──
async function webSearchDiscover(
  openai: NonNullable<ReturnType<typeof getOpenAI>>,
  input: DiscoverInput,
  context: string,
): Promise<DiscoverResponse | null> {
  // OpenAI has shipped the web-search tool under two type names across API
  // versions. Try the current one, then the preview alias, before giving up.
  const toolTypes = ["web_search", "web_search_preview"] as const;
  for (const toolType of toolTypes) {
    const parsed = await tryWebSearch(openai, input, context, toolType);
    if (parsed) return parsed;
  }
  return null;
}

async function tryWebSearch(
  openai: NonNullable<ReturnType<typeof getOpenAI>>,
  input: DiscoverInput,
  context: string,
  toolType: string,
): Promise<DiscoverResponse | null> {
  try {
    const response = await openai.responses.create({
      model: env.openaiModel,
      // Cast: tool type union narrows per SDK version; we probe multiple names.
      tools: [{ type: toolType } as never],
      input: instructions(input, context),
    });
    // SDK convenience accessor; fall back to assembling output items.
    let text = (response as { output_text?: string }).output_text ?? "";
    if (!text) {
      const chunks: string[] = [];
      for (const item of response.output ?? []) {
        const content = (item as { content?: unknown }).content;
        if (Array.isArray(content)) {
          for (const c of content) {
            const t = (c as { text?: unknown }).text;
            if (typeof t === "string") chunks.push(t);
          }
        }
      }
      text = chunks.join("\n");
    }
    const json = extractJson(text);
    if (!json) return null;
    const parsed = discoverResponseSchema.parse(json);
    return hasAny(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── 2. AI inference without search (grounded in target context) ──
async function inferenceDiscover(
  openai: NonNullable<ReturnType<typeof getOpenAI>>,
  input: DiscoverInput,
  context: string,
): Promise<DiscoverResponse | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a competitive intelligence analyst. Suggest realistic competitors as strict JSON. Use real, well-known companies. Never invent domains.",
        },
        { role: "user", content: instructions(input, context) },
      ],
    });
    const json = extractJson(completion.choices[0]?.message?.content ?? "");
    if (!json) return null;
    const parsed = discoverResponseSchema.parse(json);
    return hasAny(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function discoverCompetitors(input: DiscoverInput): Promise<DiscoverResult> {
  const context = await fetchTargetContext(input.targetUrl);
  const openai = getOpenAI();

  // No key → curated sample, but still grounded summary if we fetched it.
  if (!openai) return sampleDiscover(input, context);

  // 1. Prefer live web search for real, current competitors.
  const searched = await webSearchDiscover(openai, input, context);
  if (searched) return normalizeResult(searched, input, "web_search", context);

  // 2. Fall back to grounded AI inference.
  const inferred = await inferenceDiscover(openai, input, context);
  if (inferred) return normalizeResult(inferred, input, "ai_estimate", context);

  // 3. Last resort: curated sample so the flow never breaks.
  return sampleDiscover(input, context);
}
