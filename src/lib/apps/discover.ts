import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { env } from "@/lib/env";
import { searchApps, lookupApps, type AppInfo } from "@/lib/apps/itunes";

// Given one app, find competitor apps — mirrors the website competitor
// discovery. Primary: AI suggests competitor app names, resolved to real
// App Store entries. Fallback: top apps in the same category.

const schema = z.object({ competitors: z.array(z.string()).default([]) });

// App Store genre IDs for the common categories (for the category fallback).
const GENRE: Record<string, number> = {
  "Productivity": 6007, "Business": 6000, "Health & Fitness": 6013, "Finance": 6015,
  "Social Networking": 6005, "Education": 6017, "Lifestyle": 6012, "Travel": 6003,
  "Shopping": 6024, "Food & Drink": 6023, "Music": 6011, "Photo & Video": 6008,
  "Entertainment": 6016, "News": 6009, "Medical": 6020, "Utilities": 6002,
  "Sports": 6004, "Weather": 6001, "Reference": 6006, "Navigation": 6010,
  "Books": 6018, "Graphics & Design": 6027, "Developer Tools": 6026,
};

export interface AppDiscoverResult {
  apps: AppInfo[];
  source: "ai" | "category";
}

async function resolveNames(names: string[], targetId: number, country: string): Promise<AppInfo[]> {
  const out: AppInfo[] = [];
  const seen = new Set<number>([targetId]);
  for (const name of names.slice(0, 10)) {
    const res = await searchApps(name, country, 3);
    const hit = res.find((r) => !seen.has(r.id));
    if (hit) {
      seen.add(hit.id);
      out.push(hit);
    }
    if (out.length >= 6) break;
  }
  return out;
}

async function categoryTopApps(target: AppInfo, country: string): Promise<AppInfo[]> {
  const gid = GENRE[target.category];
  if (gid) {
    try {
      const url = `https://itunes.apple.com/${country}/rss/topfreeapplications/genre=${gid}/limit=15/json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const entries: { id?: { attributes?: { ["im:id"]?: string } } }[] = data?.feed?.entry ?? [];
        const ids = entries
          .map((e) => Number(e?.id?.attributes?.["im:id"]))
          .filter((n) => n && n !== target.id)
          .slice(0, 6);
        const apps = await lookupApps(ids, country);
        if (apps.length) return apps;
      }
    } catch {
      /* fall through */
    }
  }
  // last resort: search by category keyword
  return (await searchApps(target.category || target.name, country, 8)).filter((a) => a.id !== target.id).slice(0, 6);
}

export async function discoverCompetitorApps(target: AppInfo, country = "us"): Promise<AppDiscoverResult> {
  const openai = getOpenAI();
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: env.openaiModel,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a mobile market analyst. Given an app, list its top competitor apps (same core use case and audience). Respond ONLY with JSON {"competitors":["App Name", ...]} — 6 real, well-known competitor app names available on the App Store. Exclude the given app.',
          },
          {
            role: "user",
            content: `App: ${target.name}\nDeveloper: ${target.developer}\nCategory: ${target.category}\nAbout: ${target.description.slice(0, 500)}`,
          },
        ],
      });
      const names = schema.parse(JSON.parse(completion.choices[0]?.message?.content ?? "{}")).competitors;
      const found = await resolveNames(names, target.id, country);
      if (found.length) return { apps: found, source: "ai" };
    } catch {
      /* fall through to category */
    }
  }
  return { apps: await categoryTopApps(target, country), source: "category" };
}
