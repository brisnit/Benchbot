import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { env } from "@/lib/env";
import type { AppInfo } from "@/lib/apps/itunes";

export interface AppInsight {
  appId: number;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
}
export interface AppComparison {
  summary: string;
  recommendations: string[];
  insights: AppInsight[];
  aiEstimated: boolean;
}

const schema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()).default([]),
  insights: z
    .array(
      z.object({
        appId: z.number(),
        positioning: z.string().default(""),
        strengths: z.array(z.string()).default([]),
        weaknesses: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

function profile(a: AppInfo) {
  return {
    appId: a.id,
    name: a.name,
    developer: a.developer,
    category: a.category,
    rating: a.rating,
    ratingCount: a.ratingCount,
    price: a.price,
    screenshots: a.screenshots.length,
    version: a.version,
    releaseNotes: a.releaseNotes.slice(0, 240),
    description: a.description.slice(0, 700),
  };
}

function heuristic(target: AppInfo, all: AppInfo[]): AppComparison {
  const insights: AppInsight[] = all.map((a) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    if (a.rating >= 4.5) strengths.push(`Strong rating (${a.rating}★ from ${a.ratingCount.toLocaleString()} reviews).`);
    else if (a.rating > 0 && a.rating < 4) weaknesses.push(`Below-par rating (${a.rating}★) signals satisfaction gaps.`);
    if (a.ratingCount > 100000) strengths.push("High review volume — strong social proof and store ranking signal.");
    else if (a.ratingCount < 1000) weaknesses.push("Low review volume limits credibility and ASO ranking.");
    if (a.screenshots.length >= 6) strengths.push(`${a.screenshots.length} screenshots — rich, persuasive listing.`);
    else if (a.screenshots.length <= 3) weaknesses.push("Few screenshots — listing under-sells the experience.");
    if (a.free) strengths.push("Free to download — low acquisition friction.");
    if (a.description.length < 400) weaknesses.push("Thin description — weaker keyword coverage (ASO).");
    return {
      appId: a.id,
      positioning: `${a.name} by ${a.developer} — ${a.category}, ${a.price}.`,
      strengths,
      weaknesses,
    };
  });
  const best = [...all].sort((a, b) => b.rating - a.rating)[0];
  const recommendations = [
    target.screenshots.length < 6 ? "Add more screenshots (6–10) showcasing key flows and value props." : "Keep the screenshot set fresh and benefit-led.",
    target.ratingCount < (best?.ratingCount ?? 0) ? "Prompt happy users for reviews to close the social-proof gap." : "Sustain review velocity to defend store ranking.",
    "Front-load keywords in the title/subtitle and first description lines for ASO.",
    "Refresh the 'What's New' notes each release to signal active maintenance.",
  ];
  return {
    aiEstimated: true,
    summary: `${target.name} holds a ${target.rating}★ rating from ${target.ratingCount.toLocaleString()} reviews in ${target.category}. ${best && best.id !== target.id ? `${best.name} leads the set on rating.` : "It leads the selected set on rating."} Store-listing depth and review velocity are the biggest levers.`,
    recommendations,
    insights,
  };
}

export async function analyzeApps(target: AppInfo, competitors: AppInfo[]): Promise<AppComparison> {
  const all = [target, ...competitors];
  const openai = getOpenAI();
  if (!openai) return heuristic(target, all);

  try {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a mobile growth & ASO (App Store Optimization) analyst. Compare the target app to its competitors using their store listings. Respond ONLY with JSON: {summary, recommendations:[..], insights:[{appId, positioning, strengths:[..], weaknesses:[..]}]}. Provide an insight object for EVERY app (match appId exactly). 4-6 recommendations focused on the TARGET. Be specific and concrete.",
        },
        {
          role: "user",
          content: JSON.stringify({ target: profile(target), competitors: competitors.map(profile) }),
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = schema.parse(JSON.parse(raw));
    if (!parsed.summary || parsed.insights.length === 0) return heuristic(target, all);
    return { ...parsed, aiEstimated: false };
  } catch {
    return heuristic(target, all);
  }
}
