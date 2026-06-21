"use client";

import * as React from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SitemapDiagram } from "@/components/audit/sitemap-diagram";
import type { SitemapNode } from "@/lib/types";

// Renders a single sitemap full-bleed and auto-opens the print dialog, scaling
// the diagram to fit the printable width so nothing is clipped.
export function SitemapPrintView({
  tree,
  pageCount,
  depth,
  name,
  host,
}: {
  tree: SitemapNode;
  pageCount: number;
  depth: number;
  name: string;
  host: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    document.body.classList.add("sitemap-print-page");
    // Fit the diagram width to a landscape page (~980px usable @ 96dpi).
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const w = el.scrollWidth;
      setScale(w > 980 ? Math.max(0.35, 980 / w) : 1);
    };
    fit();
    // Auto-open the print dialog once layout/fonts have settled.
    const id = window.setTimeout(() => window.print(), 700);
    return () => {
      window.clearTimeout(id);
      document.body.classList.remove("sitemap-print-page");
    };
  }, []);

  return (
    <div className="min-h-screen bg-white p-6">
      {/* On-screen toolbar (hidden when printing) */}
      <div className="print:hidden mb-5 flex items-center justify-between border-b border-border pb-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="gradient" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.close()}>
            <X className="h-4 w-4" /> Close
          </Button>
        </div>
      </div>

      {/* Title block (also prints) */}
      <div className="mb-4">
        <h1 className="font-display text-xl font-bold text-ink">{name} — Site map</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {host} · {pageCount.toLocaleString()} pages · depth {depth}
        </p>
      </div>

      <div ref={ref} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <SitemapDiagram tree={tree} pageCount={pageCount} depth={depth} host={host} print />
      </div>
    </div>
  );
}
