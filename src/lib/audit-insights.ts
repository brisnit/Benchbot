import { nameFromUrl } from "@/lib/utils";
import type {
  AuditBundle,
  ComponentCounts,
  CrawlResult,
  NavNode,
  PageType,
  Screenshot,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Derives UX-designer views (component/element inventory, distinct page
// templates, complete navigation) from raw crawl data. Pure functions, no IO.
// ─────────────────────────────────────────────────────────────

export const COMPONENT_FIELDS: { key: keyof ComponentCounts; label: string }[] = [
  { key: "buttons", label: "Buttons" },
  { key: "links", label: "Links" },
  { key: "images", label: "Images" },
  { key: "icons", label: "Icons" },
  { key: "inputs", label: "Inputs" },
  { key: "forms", label: "Forms" },
  { key: "headings", label: "Headings" },
  { key: "sections", label: "Sections" },
  { key: "videos", label: "Videos" },
  { key: "iframes", label: "Embeds" },
];

const EMPTY_COUNTS: ComponentCounts = {
  buttons: 0,
  links: 0,
  images: 0,
  icons: 0,
  inputs: 0,
  forms: 0,
  headings: 0,
  videos: 0,
  iframes: 0,
  sections: 0,
};

function addCounts(a: ComponentCounts, b?: ComponentCounts): ComponentCounts {
  if (!b) return a;
  return {
    buttons: a.buttons + b.buttons,
    links: a.links + b.links,
    images: a.images + b.images,
    icons: a.icons + b.icons,
    inputs: a.inputs + b.inputs,
    forms: a.forms + b.forms,
    headings: a.headings + b.headings,
    videos: a.videos + b.videos,
    iframes: a.iframes + b.iframes,
    sections: a.sections + b.sections,
  };
}

export interface CompanyInventory {
  competitorId: string | null;
  name: string;
  host: string;
  pages: number; // successfully crawled pages
  elements: number; // total DOM elements across crawled pages
  components: ComponentCounts; // summed across crawled pages
  hasData: boolean;
}

function companyList(bundle: AuditBundle): { competitorId: string | null; name: string; url: string }[] {
  const target = {
    competitorId: null,
    name: bundle.audit.target_name || nameFromUrl(bundle.audit.target_url),
    url: bundle.audit.target_url,
  };
  const comps = bundle.competitors
    .filter((c) => c.selected)
    .map((c) => ({ competitorId: c.id as string | null, name: c.name, url: c.url }));
  return [target, ...comps];
}

export function inventoryByCompany(bundle: AuditBundle): CompanyInventory[] {
  return companyList(bundle).map((co) => {
    const pages = bundle.crawlResults.filter(
      (r) => r.competitor_id === co.competitorId && !r.failed,
    );
    const components = pages.reduce<ComponentCounts>(
      (acc, p) => addCounts(acc, p.component_counts),
      { ...EMPTY_COUNTS },
    );
    const elements = pages.reduce((s, p) => s + (p.element_count ?? 0), 0);
    const hasData = pages.some((p) => p.element_count != null || p.component_counts != null);
    return {
      competitorId: co.competitorId,
      name: co.name,
      host: hostOf(co.url),
      pages: pages.length,
      elements,
      components,
      hasData,
    };
  });
}

export interface TemplateEntry {
  pageType: PageType;
  url: string;
  title: string;
  elementCount?: number;
  components?: ComponentCounts;
  desktopShot?: string;
  mobileShot?: string;
}

const TEMPLATE_LABELS: Record<PageType, string> = {
  homepage: "Homepage",
  navigation: "Navigation",
  product: "Product / detail",
  category: "Category / listing",
  search: "Search",
  forms: "Forms",
  pricing: "Pricing",
  account: "Account / login",
  blog: "Blog / resources",
  contact: "Contact",
  footer: "Footer",
  other: "Other",
};

export function templateLabel(pt: PageType): string {
  return TEMPLATE_LABELS[pt] ?? pt;
}

/** Distinct page templates for one company (first crawled page per type). */
export function templatesForCompany(
  bundle: AuditBundle,
  competitorId: string | null,
): TemplateEntry[] {
  const pages = bundle.crawlResults.filter((r) => r.competitor_id === competitorId && !r.failed);
  const shots = bundle.screenshots.filter((s) => s.competitor_id === competitorId);
  const byType = new Map<PageType, CrawlResult>();
  for (const p of pages) {
    if (!byType.has(p.page_type)) byType.set(p.page_type, p);
  }
  const findShot = (pt: PageType, device: Screenshot["device_type"]) =>
    shots.find((s) => s.page_type === pt && s.device_type === device)?.storage_path;

  return [...byType.entries()].map(([pageType, p]) => ({
    pageType,
    url: p.url,
    title: p.title || templateLabel(pageType),
    elementCount: p.element_count,
    components: p.component_counts,
    desktopShot: findShot(pageType, "desktop") ?? findShot(pageType, "mobile"),
    mobileShot: findShot(pageType, "mobile"),
  }));
}

export interface CompanyNav {
  competitorId: string | null;
  name: string;
  host: string;
  nav: NavNode[];
}

/** Complete primary navigation for each company (from its homepage crawl). */
export function navByCompany(bundle: AuditBundle): CompanyNav[] {
  return companyList(bundle).map((co) => {
    const pages = bundle.crawlResults.filter((r) => r.competitor_id === co.competitorId);
    const home = pages.find((p) => p.page_type === "homepage") ?? pages[0];
    let nav: NavNode[] = home?.nav_tree ?? [];
    if (nav.length === 0 && home?.nav_items?.length) {
      nav = home.nav_items.map((label) => ({ label }));
    }
    return { competitorId: co.competitorId, name: co.name, host: hostOf(co.url), nav };
  });
}

function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
