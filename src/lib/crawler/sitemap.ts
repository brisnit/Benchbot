import { uid, hostFromUrl } from "@/lib/utils";
import type { Audit, CrawlResult, Sitemap, SitemapNode } from "@/lib/types";
import type { CompanyInput } from "@/lib/demo/generate";

// ─────────────────────────────────────────────────────────────
// Builds REAL sitemaps for the target + competitors:
//   1. Parse robots.txt → sitemap.xml (and sitemap indexes) for a true URL list.
//   2. Fall back to the same-origin links discovered during the crawl.
//   3. Last resort: a minimal tree from the homepage nav.
// Produces an accurate page_count and navigation depth. Best-effort and
// fault-tolerant — never throws; always returns one Sitemap per company.
// ─────────────────────────────────────────────────────────────

const COMMON_SECTIONS = [
  "Products",
  "Pricing",
  "Solutions",
  "Resources",
  "Blog",
  "About",
  "Contact",
  "Careers",
  "Support",
  "Docs",
];

const FETCH_OPTS = {
  headers: { "user-agent": "Mozilla/5.0 (compatible; BenchBotBot/1.0)" },
  redirect: "follow" as const,
};

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, { ...FETCH_OPTS, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

/** Collect URLs from sitemap.xml, following one level of sitemap-index. */
async function collectSitemapUrls(origin: string): Promise<string[]> {
  // robots.txt can point to one or more sitemaps.
  const robots = await fetchText(`${origin}/robots.txt`, 6000);
  const candidates = new Set<string>();
  if (robots) {
    for (const line of robots.split("\n")) {
      const match = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (match) candidates.add(match[1].trim());
    }
  }
  if (candidates.size === 0) candidates.add(`${origin}/sitemap.xml`);

  const urls = new Set<string>();
  for (const sm of candidates) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    const locs = parseLocs(xml);
    const isIndex = /<sitemapindex/i.test(xml);
    if (isIndex) {
      // Follow up to 5 child sitemaps to bound network/time.
      for (const child of locs.slice(0, 5)) {
        const childXml = await fetchText(child);
        if (childXml) parseLocs(childXml).forEach((u) => urls.add(u));
        if (urls.size > 5000) break;
      }
    } else {
      locs.forEach((u) => urls.add(u));
    }
    if (urls.size > 5000) break;
  }
  return [...urls];
}

function prettify(segment: string): string {
  const clean = decodeURIComponent(segment)
    .replace(/\.(html?|php|aspx?)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!clean) return segment;
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TreeAcc {
  children: Map<string, TreeAcc>;
  count: number;
}

function newAcc(): TreeAcc {
  return { children: new Map(), count: 0 };
}

/** Build a SitemapNode tree (capped breadth/depth) from a list of same-origin URLs. */
function buildTree(
  origin: string,
  urls: string[],
  maxDepth = 3,
  maxChildren = 12,
): { tree: SitemapNode; depth: number; pageCount: number } {
  const root = newAcc();
  let observedDepth = 1;
  const seen = new Set<string>();

  for (const raw of urls) {
    let path: string;
    try {
      const u = new URL(raw);
      // only same site
      if (hostFromUrl(u.toString()) !== hostFromUrl(origin)) continue;
      path = u.pathname;
    } catch {
      continue;
    }
    if (seen.has(path)) continue;
    seen.add(path);

    const segs = path.split("/").filter(Boolean);
    if (segs.length === 0) continue; // homepage itself
    observedDepth = Math.max(observedDepth, Math.min(segs.length, maxDepth) + 1);

    let node = root;
    for (const seg of segs.slice(0, maxDepth)) {
      // skip ultra-noisy numeric-only IDs at deeper levels
      const key = seg.toLowerCase();
      let child = node.children.get(key);
      if (!child) {
        child = newAcc();
        node.children.set(key, child);
      }
      child.count++;
      node = child;
    }
  }

  const toNode = (label: string, acc: TreeAcc, depth: number): SitemapNode => {
    const entries = [...acc.children.entries()].sort((a, b) => b[1].count - a[1].count);
    const shown = entries.slice(0, maxChildren);
    const hidden = entries.length - shown.length;
    const children: SitemapNode[] =
      depth >= maxDepth
        ? []
        : shown.map(([seg, child]) => toNode(prettify(seg), child, depth + 1));
    if (hidden > 0 && depth < maxDepth) {
      children.push({ label: `+${hidden} more` });
    }
    return children.length ? { label, children } : { label };
  };

  const tree = toNode("Home", root, 0);
  return { tree, depth: observedDepth, pageCount: seen.size + 1 /* include home */ };
}

/** Derive a tree from the links discovered during the Playwright crawl. */
function treeFromCrawl(
  origin: string,
  crawl: CrawlResult[],
): { tree: SitemapNode; depth: number; pageCount: number } | null {
  const links = crawl.flatMap((r) => r.links.map((l) => l.href)).filter(Boolean);
  if (!links.length) return null;
  const built = buildTree(origin, links);
  return built.pageCount > 1 ? built : null;
}

function missingSections(tree: SitemapNode): string[] {
  const labels = new Set<string>();
  const walk = (n: SitemapNode) => {
    labels.add(n.label.toLowerCase());
    n.children?.forEach(walk);
  };
  walk(tree);
  return COMMON_SECTIONS.filter((s) => !labels.has(s.toLowerCase())).slice(0, 5);
}

function duplicateSections(tree: SitemapNode): string[] {
  const counts = new Map<string, number>();
  tree.children?.forEach((c) => {
    const k = c.label;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

/** Build real sitemaps for every company. Falls back per-company so we always
 *  return a complete set. `fallback` provides synthetic sitemaps used only when
 *  neither sitemap.xml nor crawl links yield anything. */
export async function buildRealSitemaps(
  audit: Audit,
  companies: CompanyInput[],
  crawl: CrawlResult[],
  fallback: Sitemap[],
): Promise<Sitemap[]> {
  const out: Sitemap[] = [];

  for (const company of companies) {
    let origin: string;
    try {
      origin = new URL(/^https?:\/\//i.test(company.url) ? company.url : `https://${company.url}`).origin;
    } catch {
      const fb = fallback.find((s) => s.competitor_id === company.competitorId);
      if (fb) out.push(fb);
      continue;
    }

    const companyCrawl = crawl.filter((r) => r.competitor_id === company.competitorId);

    // 1. sitemap.xml (true page list)
    let built: { tree: SitemapNode; depth: number; pageCount: number } | null = null;
    const sitemapUrls = await collectSitemapUrls(origin);
    if (sitemapUrls.length) built = buildTree(origin, sitemapUrls);

    // 2. crawl links
    if (!built || built.pageCount <= 1) built = treeFromCrawl(origin, companyCrawl);

    // 3. synthetic fallback
    if (!built) {
      const fb = fallback.find((s) => s.competitor_id === company.competitorId);
      if (fb) {
        out.push(fb);
        continue;
      }
      built = { tree: { label: "Home" }, depth: 1, pageCount: 1 };
    }

    out.push({
      id: uid("smp_"),
      audit_id: audit.id,
      competitor_id: company.competitorId,
      tree: built.tree,
      page_count: built.pageCount,
      depth: built.depth,
      duplicate_sections: duplicateSections(built.tree),
      missing_sections: missingSections(built.tree),
      created_at: new Date().toISOString(),
    });
  }

  return out;
}
