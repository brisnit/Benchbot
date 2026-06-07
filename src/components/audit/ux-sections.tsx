import { Boxes, LayoutTemplate, Menu, Check, Minus } from "lucide-react";
import { SectionCard } from "@/components/audit/section-card";
import { ShotImage } from "@/components/audit/shot-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  COMPONENT_FIELDS,
  inventoryByCompany,
  navByCompany,
  templateLabel,
  templatesForCompany,
} from "@/lib/audit-insights";
import type { AuditBundle, NavNode, PageType } from "@/lib/types";

// ── Component & element inventory (cross-company comparison) ──
export function UxInventorySection({ bundle }: { bundle: AuditBundle }) {
  const rows = inventoryByCompany(bundle).filter((r) => r.hasData);
  if (rows.length === 0) {
    return (
      <SectionCard icon={Boxes} title="Component & Element Inventory" id="inventory">
        <p className="text-sm text-muted-foreground">
          No component data was captured for this audit. Run an audit with real crawling enabled to
          inventory each site&apos;s elements and components.
        </p>
      </SectionCard>
    );
  }
  return (
    <SectionCard
      icon={Boxes}
      title="Component & Element Inventory"
      description="Counts of UI building blocks, summed across the pages crawled per site — a quick gauge of complexity and consistency."
      id="inventory"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 font-medium text-muted-foreground">Company</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Pages</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Elements</th>
              {COMPONENT_FIELDS.map((f) => (
                <th key={f.key} className="px-2 py-2 text-right font-medium text-muted-foreground">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.competitorId ?? "target"}
                className={cn("border-b border-border/60", r.competitorId === null && "bg-brand-50/40")}
              >
                <td className="py-2.5 pr-3">
                  <span className="font-medium text-ink">{r.name}</span>
                  {r.competitorId === null && (
                    <Badge variant="brand" className="ml-2 align-middle">Target</Badge>
                  )}
                  <div className="font-mono text-[11px] text-muted-foreground">{r.host}</div>
                </td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{r.pages}</td>
                <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums">
                  {r.elements.toLocaleString()}
                </td>
                {COMPONENT_FIELDS.map((f) => (
                  <td key={f.key} className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-600">
                    {r.components[f.key].toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Page templates (distinct templates + cross-company coverage) ──
const ALL_TEMPLATES: PageType[] = [
  "homepage",
  "pricing",
  "product",
  "category",
  "blog",
  "contact",
  "forms",
  "account",
  "search",
];

export function PageTemplatesSection({ bundle }: { bundle: AuditBundle }) {
  const targetTemplates = templatesForCompany(bundle, null);
  const companies = [
    { competitorId: null as string | null, name: bundle.audit.target_name },
    ...bundle.competitors.filter((c) => c.selected).map((c) => ({ competitorId: c.id as string | null, name: c.name })),
  ];

  if (targetTemplates.length === 0) {
    return (
      <SectionCard icon={LayoutTemplate} title="Page Templates" id="templates">
        <p className="text-sm text-muted-foreground">No page templates were captured for this audit.</p>
      </SectionCard>
    );
  }

  // coverage: which templates each company has at least one crawled page for
  const coverage = companies.map((co) => {
    const types = new Set(templatesForCompany(bundle, co.competitorId).map((t) => t.pageType));
    return { name: co.name, isTarget: co.competitorId === null, types };
  });
  const templatesPresent = ALL_TEMPLATES.filter((t) => coverage.some((c) => c.types.has(t)));

  return (
    <SectionCard
      icon={LayoutTemplate}
      title="Page Templates"
      description={`${targetTemplates.length} distinct templates captured for ${bundle.audit.target_name}. Compare against competitors below.`}
      id="templates"
    >
      {/* target template cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {targetTemplates.map((t) => (
          <figure key={t.pageType} className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <div className="aspect-[4/3] overflow-hidden bg-secondary">
              {t.desktopShot ? (
                <ShotImage src={t.desktopShot} alt={`${t.title} template`} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No screenshot</div>
              )}
            </div>
            <figcaption className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="brand">{templateLabel(t.pageType)}</Badge>
                {t.elementCount != null && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t.elementCount.toLocaleString()} els
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground" title={t.url}>{t.url}</p>
              {t.components && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-slate-500">
                  <span>{t.components.buttons} btn</span>
                  <span>{t.components.images} img</span>
                  <span>{t.components.forms} form</span>
                  <span>{t.components.headings} h</span>
                </div>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* coverage matrix */}
      {templatesPresent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Template coverage across the set
          </p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 font-medium text-muted-foreground">Company</th>
                  {templatesPresent.map((t) => (
                    <th key={t} className="px-2 py-2 text-center font-medium text-muted-foreground">
                      {templateLabel(t)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverage.map((c) => (
                  <tr key={c.name} className={cn("border-b border-border/60", c.isTarget && "bg-brand-50/40")}>
                    <td className="py-2.5 pr-3 font-medium text-ink">
                      {c.name}
                      {c.isTarget && <Badge variant="brand" className="ml-2 align-middle">Target</Badge>}
                    </td>
                    {templatesPresent.map((t) => (
                      <td key={t} className="px-2 py-2.5 text-center">
                        {c.types.has(t) ? (
                          <Check className="mx-auto h-4 w-4 text-good" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Complete navigation (per company, with nesting) ──
function NavList({ nodes, depth = 0 }: { nodes: NavNode[]; depth?: number }) {
  return (
    <ul className={cn(depth > 0 && "ml-3 border-l border-border pl-3")}>
      {nodes.map((n, i) => (
        <li key={`${n.label}-${i}`} className="py-0.5">
          <span className={cn("text-sm", depth === 0 ? "font-medium text-ink" : "text-slate-600")}>
            {n.label}
          </span>
          {n.children && n.children.length > 0 && <NavList nodes={n.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function CompleteNavSection({ bundle }: { bundle: AuditBundle }) {
  const navs = navByCompany(bundle).filter((n) => n.nav.length > 0);
  if (navs.length === 0) {
    return (
      <SectionCard icon={Menu} title="Complete Navigation" id="navigation">
        <p className="text-sm text-muted-foreground">No navigation was captured for this audit.</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard
      icon={Menu}
      title="Complete Navigation"
      description="The full primary navigation of each site, including sub-menus — for a true information-architecture comparison."
      id="navigation"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {navs.map((n) => (
          <div key={n.competitorId ?? "target"} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{n.name}</span>
              {n.competitorId === null && <Badge variant="brand">Target</Badge>}
            </div>
            <p className="mb-3 font-mono text-[11px] text-muted-foreground">{n.host}</p>
            <NavList nodes={n.nav} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
