"use client";

import * as React from "react";
import { GitBranch, Maximize2, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SitemapDiagram } from "@/components/audit/sitemap-diagram";
import { cn } from "@/lib/utils";
import type { Sitemap } from "@/lib/types";

export interface SitemapItem {
  sitemap: Sitemap;
  name: string;
  host: string;
  isTarget: boolean;
}

// A gallery of compact sitemap cards (one per site). Each card previews the
// top-level sections + key stats; clicking opens the full visual diagram in a
// modal (with Save PDF). Keeps large sitemaps from overwhelming the page.
export function SitemapGallery({ items }: { items: SitemapItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const active = openIndex != null ? items[openIndex] : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <SitemapCard key={item.sitemap.id} item={item} onOpen={() => setOpenIndex(i)} />
        ))}
      </div>

      <Dialog open={openIndex != null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1180px] overflow-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-brand" />
                  {active.name} — site map
                  {active.isTarget && <Badge variant="brand">Target</Badge>}
                </DialogTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {active.host} · {active.sitemap.page_count.toLocaleString()} pages · depth{" "}
                  {active.sitemap.depth}
                </p>
              </DialogHeader>
              <SitemapDiagram
                tree={active.sitemap.tree}
                pageCount={active.sitemap.page_count}
                depth={active.sitemap.depth}
                host={active.host}
                printable
                showSavePdf
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SitemapCard({ item, onOpen }: { item: SitemapItem; onOpen: () => void }) {
  const sections = item.sitemap.tree.children ?? [];
  const previewCount = 7;
  const shown = sections.slice(0, previewCount);
  const hidden = sections.length - shown.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md",
        item.isTarget ? "border-brand/40 ring-1 ring-brand/15" : "border-border",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-ink">{item.name}</span>
            {item.isTarget && <Badge variant="brand">Target</Badge>}
          </div>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{item.host}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-brand group-hover:text-white">
          <Maximize2 className="h-4 w-4" />
        </span>
      </div>

      {/* stats */}
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          <span className="font-mono font-semibold text-ink">{item.sitemap.page_count.toLocaleString()}</span> pages
        </span>
        <span>
          depth <span className="font-mono font-semibold text-ink">{item.sitemap.depth}</span>
        </span>
        <span>
          <span className="font-mono font-semibold text-ink">{sections.length}</span> sections
        </span>
      </div>

      {/* top-level section preview */}
      <div className="flex flex-wrap gap-1.5">
        {shown.map((s, i) => (
          <span
            key={`${s.label}-${i}`}
            className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-slate-600"
          >
            {s.label}
          </span>
        ))}
        {hidden > 0 && (
          <span className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-muted-foreground">
            +{hidden} more
          </span>
        )}
      </div>

      <span className="mt-3 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
        View full sitemap →
      </span>
    </button>
  );
}
