import fs from "node:fs";
import path from "node:path";
import { uid, hostFromUrl, normalizeUrl } from "@/lib/utils";
import type {
  Audit,
  CrawlResult,
  DeviceType,
  PageType,
  Screenshot,
} from "@/lib/types";
import type { CompanyInput } from "@/lib/demo/generate";

// ─────────────────────────────────────────────────────────────
// Real crawler powered by Playwright. Best-effort and fault-tolerant:
// any page that fails to load is recorded as a failed CrawlResult rather
// than throwing, so an audit always produces partial results. Screenshots
// are written to .data/screenshots and served via /api/screenshot-file/[name].
// Gated behind ENABLE_REAL_CRAWL — otherwise the generator's mock data is used.
// ─────────────────────────────────────────────────────────────

const SHOTS_DIR = path.join(process.cwd(), ".data", "screenshots");

function ensureShotsDir() {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

export interface CrawlOutput {
  crawlResults: CrawlResult[];
  screenshots: Screenshot[];
  failures: string[];
}

function devicesFor(mode: Audit["device_mode"]): DeviceType[] {
  if (mode === "both") return ["desktop", "mobile"];
  if (mode === "mobile") return ["mobile"];
  return ["desktop"];
}

export async function crawlAudit(
  audit: Audit,
  companies: CompanyInput[],
): Promise<CrawlOutput> {
  const crawlResults: CrawlResult[] = [];
  const screenshots: Screenshot[] = [];
  const failures: string[] = [];
  ensureShotsDir();

  // Imported lazily so the bundle/runtime only loads Playwright when crawling.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const devices = devicesFor(audit.device_mode);
    for (const company of companies) {
      const maxPages = company.competitorId === null ? 6 : 4;
      const visited = new Set<string>();
      const queue: string[] = [normalizeUrl(company.url) ?? company.url];

      // Crawl pages (homepage first, then a few internal links).
      while (queue.length && visited.size < maxPages) {
        const url = queue.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);
        const context = await browser.newContext({ viewport: DESKTOP, userAgent: "BenchBotBot/1.0" });
        const page = await context.newPage();
        try {
          const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          const data = await page.evaluate(() => {
            const q = (sel: string) => Array.from(document.querySelectorAll(sel));
            const text = (el: Element | null) => (el?.textContent ?? "").trim();
            const navLinks = q("header a, nav a")
              .map((a) => text(a))
              .filter((t) => t && t.length < 30)
              .slice(0, 12);
            const links = q("a[href]")
              .slice(0, 40)
              .map((a) => ({ label: text(a).slice(0, 40), href: (a as HTMLAnchorElement).href }));
            const footerLinks = q("footer a").map((a) => text(a)).filter(Boolean).slice(0, 12);
            const ctas = q("a, button")
              .map((el) => text(el))
              .filter((t) => /get|start|try|demo|sign|buy|contact|book|free|quote/i.test(t))
              .slice(0, 8);
            const forms = q("form").map((f) => ({
              fields: f.querySelectorAll("input, select, textarea").length,
              label: text(f.querySelector("h1,h2,h3,legend,label")) || "Form",
            }));
            const schema = q('script[type="application/ld+json"]')
              .map((s) => {
                try {
                  const j = JSON.parse(s.textContent || "{}");
                  return (Array.isArray(j) ? j : [j]).map((x) => x["@type"]).flat();
                } catch {
                  return [];
                }
              })
              .flat()
              .filter(Boolean) as string[];
            return {
              title: document.title,
              metaDescription:
                document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
              h1: text(document.querySelector("h1")),
              navLinks,
              links,
              footerLinks,
              ctas,
              forms,
              schema: Array.from(new Set(schema)),
            };
          });

          // robots / sitemap availability (homepage only)
          let hasRobots = false;
          let hasSitemap = false;
          if (visited.size === 1) {
            const origin = new URL(url).origin;
            hasRobots = await headOk(page, `${origin}/robots.txt`);
            hasSitemap = await headOk(page, `${origin}/sitemap.xml`);
          }

          crawlResults.push({
            id: uid("crl_"),
            audit_id: audit.id,
            competitor_id: company.competitorId,
            url,
            page_type: classifyPage(url, data.title),
            title: data.title,
            meta_description: data.metaDescription,
            h1: data.h1,
            nav_items: data.navLinks,
            links: data.links,
            footer_links: data.footerLinks,
            ctas: data.ctas,
            forms: data.forms,
            schema_types: data.schema,
            has_robots: hasRobots,
            has_sitemap: hasSitemap,
            status_code: resp?.status() ?? 200,
            failed: false,
            created_at: new Date().toISOString(),
          });

          // enqueue same-origin internal links
          if (queue.length + visited.size < maxPages) {
            const origin = new URL(url).origin;
            for (const l of data.links) {
              try {
                const u = new URL(l.href);
                if (u.origin === origin && !visited.has(u.toString())) {
                  queue.push(u.toString());
                }
              } catch {
                /* skip */
              }
              if (queue.length + visited.size >= maxPages) break;
            }
          }

          // screenshots for the homepage page only (keep it light)
          if (visited.size === 1) {
            for (const device of devices) {
              await page.setViewportSize(device === "mobile" ? MOBILE : DESKTOP);
              const name = `${audit.id}_${company.competitorId ?? "target"}_${device}_${uid()}.png`;
              const file = path.join(SHOTS_DIR, name);
              try {
                await page.screenshot({ path: file, fullPage: false });
                screenshots.push({
                  id: uid("shot_"),
                  audit_id: audit.id,
                  competitor_id: company.competitorId,
                  company_name: company.name,
                  url,
                  device_type: device,
                  page_type: "homepage",
                  storage_path: `/api/screenshot-file/${name}`,
                  created_at: new Date().toISOString(),
                });
              } catch {
                failures.push(`${company.name} ${device} screenshot`);
              }
            }
          }
        } catch (err) {
          failures.push(`${url} (${(err as Error).message.slice(0, 60)})`);
          crawlResults.push({
            id: uid("crl_"),
            audit_id: audit.id,
            competitor_id: company.competitorId,
            url,
            page_type: "homepage",
            title: "",
            meta_description: "",
            h1: "",
            nav_items: [],
            links: [],
            footer_links: [],
            ctas: [],
            forms: [],
            schema_types: [],
            has_robots: false,
            has_sitemap: false,
            status_code: 0,
            failed: true,
            created_at: new Date().toISOString(),
          });
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  return { crawlResults, screenshots, failures };
}

async function headOk(page: import("playwright").Page, url: string): Promise<boolean> {
  try {
    const res = await page.request.get(url, { timeout: 8000 });
    return res.ok();
  } catch {
    return false;
  }
}

function classifyPage(url: string, title: string): PageType {
  const u = (url + " " + title).toLowerCase();
  if (/pricing|plans/.test(u)) return "pricing";
  if (/product|item|/.test(u) && /product/.test(u)) return "product";
  if (/category|collection|shop/.test(u)) return "category";
  if (/blog|resource|guide|article/.test(u)) return "blog";
  if (/contact/.test(u)) return "contact";
  if (/login|account|signin|sign-in/.test(u)) return "account";
  if (/search/.test(u)) return "search";
  const host = hostFromUrl(url);
  if (url.replace(/\/$/, "").endsWith(host)) return "homepage";
  return "other";
}

export function readScreenshotFile(name: string): Buffer | null {
  try {
    const safe = path.basename(name);
    const file = path.join(SHOTS_DIR, safe);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}
