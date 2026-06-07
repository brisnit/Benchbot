"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SitemapNode } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Brand "site map" diagram: each page renders as a browser-window card
// (dark header + window dots + arrow glyph), connected top-down — the root
// and top-level sections in a horizontal org-chart, deeper pages as vertical
// connector trees. Includes a legend and a print-to-PDF action.
// ─────────────────────────────────────────────────────────────

const HEADER_DARK = "#241D52";

function WindowDots() {
  return (
    <span className="flex items-center gap-[3px]">
      <span className="h-[5px] w-[5px] rounded-full bg-white/35" />
      <span className="h-[5px] w-[5px] rounded-full bg-white/35" />
      <span className="h-[5px] w-[5px] rounded-full bg-white/35" />
    </span>
  );
}

function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={cn("text-brand", className)} fill="none" aria-hidden="true">
      <path d="M4 13 L18 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 4 h-5 M18 4 v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Variant = "root" | "section" | "page";

function SiteNode({ label, variant }: { label: string; variant: Variant }) {
  const isMore = label.startsWith("+");
  if (isMore) {
    return (
      <div className="inline-flex w-28 items-center justify-center rounded-md border border-dashed border-slate-300 bg-secondary/60 px-2 py-2 text-center text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
    );
  }
  const width = variant === "root" ? "w-44" : variant === "section" ? "w-36" : "w-32";
  return (
    <div
      className={cn(
        "inline-block overflow-hidden rounded-md border border-border bg-white shadow-sm",
        width,
      )}
    >
      <div
        className="flex items-center gap-1 px-2 py-[5px]"
        style={{ backgroundColor: HEADER_DARK }}
      >
        <WindowDots />
      </div>
      <div className="px-2 py-2.5 text-center">
        <p
          className={cn(
            "font-medium leading-tight text-ink",
            variant === "root" ? "text-sm" : "text-[11px]",
          )}
        >
          {label}
        </p>
        <ArrowGlyph className={cn("mx-auto mt-2", variant === "root" ? "h-4 w-6" : "h-3 w-5")} />
      </div>
    </div>
  );
}

/** Vertical connector tree for everything below a top-level section. */
function Branch({ nodes }: { nodes: SitemapNode[] }) {
  if (!nodes.length) return null;
  return (
    <ul>
      {nodes.map((n, i) => (
        <li key={`${n.label}-${i}`} className="pt-3">
          <SiteNode label={n.label} variant="page" />
          {n.children && n.children.length > 0 ? <Branch nodes={n.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  const items = [
    { label: "Top-level section", swatch: "section" as const },
    { label: "Page", swatch: "page" as const },
    { label: "Truncated branch", swatch: "more" as const },
  ];
  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key</p>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-xs text-slate-600">
            {it.swatch === "more" ? (
              <span className="h-4 w-6 rounded border border-dashed border-slate-300 bg-secondary/60" />
            ) : (
              <span className="overflow-hidden rounded border border-border">
                <span className="block h-1.5 w-6" style={{ backgroundColor: HEADER_DARK }} />
                <span className="block h-2.5 w-6 bg-white" />
              </span>
            )}
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SitemapDiagram({
  tree,
  pageCount,
  depth,
  host,
  printable = false,
  showSavePdf = false,
}: {
  tree: SitemapNode;
  pageCount?: number;
  depth?: number;
  host?: string;
  printable?: boolean;
  showSavePdf?: boolean;
}) {
  const sections = tree.children ?? [];

  function savePdf() {
    document.body.classList.add("printing-sitemap");
    const cleanup = () => {
      document.body.classList.remove("printing-sitemap");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    // Safari fallback if afterprint doesn't fire.
    setTimeout(cleanup, 1500);
  }

  return (
    <div>
      {showSavePdf && (
        <div className="sitemap-noprint mb-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={savePdf}>
            <Download className="h-4 w-4" /> Save PDF
          </Button>
        </div>
      )}

      <div
        id={printable ? "sitemap-print" : undefined}
        className="overflow-x-auto rounded-xl border border-border bg-[#FAFBFE] p-6 scrollbar-thin"
      >
        {/* Print header (only visible when printing) */}
        <div className="mb-4 hidden items-center justify-between print:flex">
          <span className="font-display text-base font-bold text-ink">
            Site map{host ? ` — ${host}` : ""}
          </span>
          {(pageCount != null || depth != null) && (
            <span className="font-mono text-xs text-slate-500">
              {pageCount != null ? `${pageCount.toLocaleString()} pages` : ""}
              {depth != null ? ` · depth ${depth}` : ""}
            </span>
          )}
        </div>

        <div className="flex items-start gap-6">
          {/* The tree */}
          <div className="smtree inline-flex min-w-min flex-col items-center">
            <SiteNode label={tree.label || "Home"} variant="root" />

            {sections.length > 0 && (
              <>
                {/* trunk from root */}
                <div className="h-5 w-px bg-[#d7dce8]" />
                {/* sections row with org-chart bus */}
                <div className="flex items-start">
                  {sections.map((section, i) => {
                    const first = i === 0;
                    const last = i === sections.length - 1;
                    const only = sections.length === 1;
                    return (
                      <div key={`${section.label}-${i}`} className="flex flex-col items-center px-3">
                        {/* connector area: horizontal bus + vertical drop */}
                        <div className="relative h-5 w-full">
                          {!only && (
                            <div
                              className="absolute top-0 border-t-[1.5px] border-[#d7dce8]"
                              style={{
                                left: first ? "50%" : 0,
                                right: last ? "50%" : 0,
                              }}
                            />
                          )}
                          <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-[#d7dce8]" />
                        </div>
                        <SiteNode label={section.label} variant="section" />
                        {/* descendants as a vertical connector tree */}
                        {section.children && section.children.length > 0 && (
                          <div className="mt-3 self-start pl-2">
                            <Branch nodes={section.children} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="sticky right-0 shrink-0">
            <Legend />
          </div>
        </div>
      </div>
    </div>
  );
}
