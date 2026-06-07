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
      const maxPages = company.competitorId === null ? 8 : 5;
      const visited = new Set<string>();
      // Track which (template, device) screenshots we've taken so we capture one
      // shot per distinct page template rather than only the homepage.
      const capturedShots = new Set<string>();
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
            const count = (sel: string) => document.querySelectorAll(sel).length;
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

            // ── UX inventory: component + element counts ──
            const components = {
              buttons: count("button, [role=button], input[type=submit], input[type=button], a.btn, a.button"),
              links: count("a[href]"),
              images: count("img, picture, [role=img]"),
              icons: count("svg"),
              inputs: count("input, select, textarea"),
              forms: count("form"),
              headings: count("h1, h2, h3, h4, h5, h6"),
              videos: count("video"),
              iframes: count("iframe"),
              sections: count("section, article, aside, main, header, footer, nav, [role=region]"),
            };
            const elementCount = document.querySelectorAll("*").length;

            // ── Complete primary navigation (one level of nesting) ──
            const navRoot =
              document.querySelector("header nav") ||
              document.querySelector("nav[role='navigation']") ||
              document.querySelector("header [role='navigation']") ||
              document.querySelector("nav");
            let navTree: { label: string; href?: string; children?: { label: string; href?: string }[] }[] = [];
            if (navRoot) {
              const topUl = navRoot.querySelector("ul");
              if (topUl) {
                const lis = Array.from(topUl.children).filter((c) => c.tagName === "LI");
                navTree = lis
                  .map((li) => {
                    const a = li.querySelector("a");
                    const label = (text(a) || text(li)).slice(0, 40);
                    const href = a ? (a as HTMLAnchorElement).href : undefined;
                    const subs = Array.from(li.querySelectorAll("ul a"))
                      .slice(0, 12)
                      .map((s) => ({ label: text(s).slice(0, 40), href: (s as HTMLAnchorElement).href }))
                      .filter((x) => x.label && x.label !== label);
                    return { label, href, children: subs.length ? subs : undefined };
                  })
                  .filter((x) => x.label);
              } else {
                navTree = Array.from(navRoot.querySelectorAll("a"))
                  .slice(0, 16)
                  .map((a) => ({ label: text(a).slice(0, 40), href: (a as HTMLAnchorElement).href }))
                  .filter((x) => x.label);
              }
              // de-dupe by label
              const seen = new Set<string>();
              navTree = navTree.filter((i) => (seen.has(i.label) ? false : (seen.add(i.label), true))).slice(0, 14);
            }

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
              components,
              elementCount,
              navTree,
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

          const pageType = classifyPage(url, data.title);
          crawlResults.push({
            id: uid("crl_"),
            audit_id: audit.id,
            competitor_id: company.competitorId,
            url,
            page_type: pageType,
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
            element_count: data.elementCount,
            component_counts: data.components,
            nav_tree: data.navTree,
            created_at: new Date().toISOString(),
          });

          // Enqueue same-origin internal links, prioritising distinct templates
          // (pricing, product, blog, contact, about, forms) so we capture a
          // diverse set of page templates within the crawl budget.
          if (queue.length + visited.size < maxPages) {
            const origin = new URL(url).origin;
            const templateRe = /pricing|plans|product|features|solutions|blog|resresources|resources|guide|article|news|contact|about|company|demo|signup|sign-up|login|account|search|cart|checkout|category|collection|shop|faq|support|help/i;
            const candidates: string[] = [];
            // Keep at most one page per top-level section so we capture diverse
            // templates instead of many near-identical pages (e.g. /newsroom/...).
            const seenSegments = new Set<string>();
            for (const u0 of [...visited, ...queue]) {
              try {
                seenSegments.add(new URL(u0).pathname.split("/").filter(Boolean)[0] ?? "root");
              } catch {
                /* ignore */
              }
            }
            for (const l of data.links) {
              try {
                const u = new URL(l.href);
                u.hash = "";
                const seg = u.pathname.split("/").filter(Boolean)[0] ?? "root";
                if (
                  u.origin === origin &&
                  !visited.has(u.toString()) &&
                  !queue.includes(u.toString()) &&
                  !seenSegments.has(seg)
                ) {
                  candidates.push(u.toString());
                  seenSegments.add(seg);
                }
              } catch {
                /* skip */
              }
            }
            // template-matching URLs first, then the rest
            candidates
              .sort((a, b) => (templateRe.test(b) ? 1 : 0) - (templateRe.test(a) ? 1 : 0))
              .forEach((c) => {
                if (queue.length + visited.size < maxPages) queue.push(c);
              });
          }

          // Capture one full-page screenshot per distinct template (page type),
          // for each device — so designers can compare disparate templates.
          for (const device of devices) {
            const shotKey = `${pageType}_${device}`;
            if (capturedShots.has(shotKey)) continue;
            capturedShots.add(shotKey);
            await page.setViewportSize(device === "mobile" ? MOBILE : DESKTOP);
            const name = `${audit.id}_${company.competitorId ?? "target"}_${pageType}_${device}_${uid()}.png`;
            const file = path.join(SHOTS_DIR, name);
            try {
              // Let lazy content/below-the-fold render before a full-page capture.
              await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                  let y = 0;
                  const step = () => {
                    window.scrollBy(0, window.innerHeight);
                    y += window.innerHeight;
                    if (y >= document.body.scrollHeight || y > 12000) {
                      window.scrollTo(0, 0);
                      resolve();
                    } else {
                      setTimeout(step, 120);
                    }
                  };
                  step();
                });
              });
              await page.waitForTimeout(300);
              await page.screenshot({ path: file, fullPage: true });
              screenshots.push({
                id: uid("shot_"),
                audit_id: audit.id,
                competitor_id: company.competitorId,
                company_name: company.name,
                url,
                device_type: device,
                page_type: pageType,
                storage_path: `/api/screenshot-file/${name}`,
                created_at: new Date().toISOString(),
              });
            } catch {
              failures.push(`${company.name} ${pageType} ${device} screenshot`);
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
